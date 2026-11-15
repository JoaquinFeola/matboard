import {
  HANDLE_CURSORS,
  hitHandle,
  oppositeAnchor,
  selectionFrame,
  type HandleId,
} from '../editor/handles';
import { rotateElements, scaleElements } from '../editor/transform';
import { UpdateElements } from '../history/commands';
import { boundsFromPoints, type Bounds } from '../math/bounds';
import { round, type Point } from '../math/vec';
import { updateElement, type Element } from '../model/element';
import { elementTouchesRect } from '../model/geometry';
import { findTopElementAt } from './picking';
import type { Tool, ToolHost, ToolPointer } from './types';

/** Paso del ángulo con Shift al rotar. */
const ROTATE_SNAP = Math.PI / 12;

type Gesture =
  | { kind: 'idle' }
  | { kind: 'move'; start: Point; originals: Element[]; moved: boolean }
  | { kind: 'marquee'; start: Point; current: Point; base: Set<string> }
  | { kind: 'resize'; handle: HandleId; frame: Bounds; anchor: Point; originals: Element[]; current: Element[] }
  | { kind: 'rotate'; pivot: Point; startAngle: number; originals: Element[]; current: Element[] };

/** Clic, Shift+clic, rectángulo de selección, mover, redimensionar y rotar. */
export class SelectTool implements Tool {
  readonly id = 'select';
  readonly cursor = 'default';
  private gesture: Gesture = { kind: 'idle' };

  constructor(private readonly host: ToolHost) {}

  /** true mientras se mueve, redimensiona o rota (las manijas se ocultan). */
  get isTransforming(): boolean {
    const kind = this.gesture.kind;
    return kind === 'move' || kind === 'resize' || kind === 'rotate';
  }

  pointerDown(pointer: ToolPointer): void {
    if (this.startTransform(pointer)) return;

    const { selection } = this.host;
    const hit = findTopElementAt(this.host, pointer.world);
    if (!hit) {
      const base = pointer.shiftKey ? new Set(selection.current) : new Set<string>();
      if (!pointer.shiftKey) selection.clear();
      this.gesture = { kind: 'marquee', start: pointer.world, current: pointer.world, base };
      return;
    }
    if (pointer.shiftKey) {
      selection.toggle(hit.id);
      if (!selection.has(hit.id)) return;
    } else if (!selection.has(hit.id)) {
      selection.set([hit.id]);
    }
    this.gesture = { kind: 'move', start: pointer.world, originals: this.selected(), moved: false };
  }

  pointerMove(pointer: ToolPointer, isDown: boolean): void {
    const gesture = this.gesture;
    if (!isDown || gesture.kind === 'idle') {
      this.updateHoverCursor(pointer.world);
      return;
    }
    switch (gesture.kind) {
      case 'move': {
        const dx = pointer.world.x - gesture.start.x;
        const dy = pointer.world.y - gesture.start.y;
        gesture.moved = gesture.moved || dx !== 0 || dy !== 0;
        this.host.scene.upsert(translate(gesture.originals, dx, dy));
        break;
      }
      case 'marquee': {
        gesture.current = pointer.world;
        const rect = boundsFromPoints(gesture.start, gesture.current);
        const touched = this.host.scene
          .query(rect)
          .filter((element) => elementTouchesRect(element, rect))
          .map((element) => element.id);
        this.host.selection.set([...gesture.base, ...touched]);
        break;
      }
      case 'resize':
        gesture.current = this.resized(gesture, pointer);
        this.host.scene.upsert(gesture.current);
        break;
      case 'rotate': {
        let delta = angleFrom(gesture.pivot, pointer.world) - gesture.startAngle;
        if (pointer.shiftKey) delta = Math.round(delta / ROTATE_SNAP) * ROTATE_SNAP;
        gesture.current = rotateElements(gesture.originals, gesture.pivot, delta);
        this.host.scene.upsert(gesture.current);
        break;
      }
    }
    this.host.requestOverlay();
  }

  pointerUp(pointer: ToolPointer): void {
    const gesture = this.gesture;
    this.gesture = { kind: 'idle' };
    if (gesture.kind === 'move' && gesture.moved) {
      const moved = translate(
        gesture.originals,
        pointer.world.x - gesture.start.x,
        pointer.world.y - gesture.start.y,
      );
      this.host.scene.upsert(moved);
      this.host.record(new UpdateElements(gesture.originals, moved, 'Mover'));
    } else if ((gesture.kind === 'resize' || gesture.kind === 'rotate') && gesture.current !== gesture.originals) {
      const label = gesture.kind === 'resize' ? 'Redimensionar' : 'Rotar';
      this.host.record(new UpdateElements(gesture.originals, gesture.current, label));
    }
    this.updateHoverCursor(pointer.world);
    this.host.requestOverlay();
  }

  cancel(): void {
    const gesture = this.gesture;
    if (gesture.kind === 'move' || gesture.kind === 'resize' || gesture.kind === 'rotate') {
      this.host.scene.upsert(gesture.originals);
    }
    this.gesture = { kind: 'idle' };
    this.host.requestOverlay();
  }

  doubleClick(pointer: ToolPointer): void {
    const hit = findTopElementAt(this.host, pointer.world);
    if (hit?.type === 'text') this.host.beginTextEdit({ element: hit, at: { x: hit.x, y: hit.y } });
  }

  paintOverlay(ctx: CanvasRenderingContext2D): void {
    const gesture = this.gesture;
    if (gesture.kind !== 'marquee') return;
    const rect = boundsFromPoints(gesture.start, gesture.current);
    const theme = this.host.theme();
    ctx.fillStyle = theme.selectionFill;
    ctx.fillRect(rect.minX, rect.minY, rect.maxX - rect.minX, rect.maxY - rect.minY);
    ctx.lineWidth = 1 / this.host.camera.zoom;
    ctx.strokeStyle = theme.selection;
    ctx.strokeRect(rect.minX, rect.minY, rect.maxX - rect.minX, rect.maxY - rect.minY);
  }

  /** Empieza a redimensionar o rotar si el clic cae en una manija. */
  private startTransform(pointer: ToolPointer): boolean {
    const originals = this.selected();
    if (originals.length === 0) return false;
    const zoom = this.host.camera.zoom;
    const frame = selectionFrame(originals, zoom);
    const handle = hitHandle(frame, zoom, pointer.world);
    if (!handle) return false;

    if (handle === 'rotate') {
      const pivot = { x: (frame.minX + frame.maxX) / 2, y: (frame.minY + frame.maxY) / 2 };
      this.gesture = { kind: 'rotate', pivot, startAngle: angleFrom(pivot, pointer.world), originals, current: originals };
      this.host.setCursor('grabbing');
    } else {
      const anchor = oppositeAnchor(frame, handle);
      this.gesture = { kind: 'resize', handle, frame, anchor, originals, current: originals };
    }
    return true;
  }

  /** Factores de escala según la manija; Shift (o si hay texto) mantiene la proporción. */
  private resized(gesture: Extract<Gesture, { kind: 'resize' }>, pointer: ToolPointer): Element[] {
    const { handle, frame, anchor, originals } = gesture;
    const width = Math.max(frame.maxX - frame.minX, 1e-6);
    const height = Math.max(frame.maxY - frame.minY, 1e-6);
    const horizontal = handle.includes('e') || handle.includes('w');
    const vertical = handle.startsWith('n') || handle.startsWith('s');
    const dirX = handle.includes('w') ? -1 : 1;
    const dirY = handle.startsWith('n') ? -1 : 1;

    let sx = horizontal ? ((pointer.world.x - anchor.x) * dirX) / width : 1;
    let sy = vertical ? ((pointer.world.y - anchor.y) * dirY) / height : 1;
    const keepRatio = pointer.shiftKey || originals.some((e) => e.type === 'text');
    if (keepRatio) {
      const s = horizontal && vertical ? Math.max(Math.abs(sx), Math.abs(sy)) : Math.abs(horizontal ? sx : sy);
      sx = horizontal ? Math.sign(sx || 1) * s : s;
      sy = vertical ? Math.sign(sy || 1) * s : s;
    }
    // Evita colapsar a cero (la geometría no se podría recuperar).
    const minScale = 2 / (Math.max(width, height) * this.host.camera.zoom);
    sx = Math.abs(sx) < minScale ? Math.sign(sx || 1) * minScale : sx;
    sy = Math.abs(sy) < minScale ? Math.sign(sy || 1) * minScale : sy;
    return scaleElements(originals, anchor, sx, sy);
  }

  private selected(): Element[] {
    return [...this.host.selection.current]
      .map((id) => this.host.scene.get(id))
      .filter((e): e is Element => e !== undefined);
  }

  private updateHoverCursor(at: Point): void {
    const selected = this.selected();
    if (selected.length > 0) {
      const zoom = this.host.camera.zoom;
      const handle = hitHandle(selectionFrame(selected, zoom), zoom, at);
      if (handle) {
        this.host.setCursor(HANDLE_CURSORS[handle]);
        return;
      }
    }
    this.host.setCursor(findTopElementAt(this.host, at) ? 'move' : this.cursor);
  }
}

function translate(elements: readonly Element[], dx: number, dy: number): Element[] {
  return elements.map((element) =>
    updateElement(element, { x: round(element.x + dx), y: round(element.y + dy) }),
  );
}

const angleFrom = (pivot: Point, at: Point) => Math.atan2(at.y - pivot.y, at.x - pivot.x);
