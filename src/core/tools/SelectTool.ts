import { UpdateElements } from '../history/commands';
import { boundsFromPoints, type Bounds } from '../math/bounds';
import { round, type Point } from '../math/vec';
import { updateElement, type Element } from '../model/element';
import { elementTouchesRect } from '../model/geometry';
import { findTopElementAt } from './picking';
import type { Tool, ToolHost, ToolPointer } from './types';

type Gesture =
  | { kind: 'idle' }
  | { kind: 'move'; start: Point; originals: Element[]; moved: boolean }
  | { kind: 'marquee'; start: Point; current: Point; base: Set<string> };

/** Clic, Shift+clic, rectángulo de selección y arrastre para mover. */
export class SelectTool implements Tool {
  readonly id = 'select';
  readonly cursor = 'default';
  private gesture: Gesture = { kind: 'idle' };

  constructor(private readonly host: ToolHost) {}

  pointerDown(pointer: ToolPointer): void {
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
    const originals = [...selection.current]
      .map((id) => this.host.scene.get(id))
      .filter((e): e is Element => e !== undefined);
    this.gesture = { kind: 'move', start: pointer.world, originals, moved: false };
  }

  pointerMove(pointer: ToolPointer, isDown: boolean): void {
    const gesture = this.gesture;
    if (!isDown || gesture.kind === 'idle') {
      this.updateHoverCursor(pointer.world);
      return;
    }
    if (gesture.kind === 'move') {
      const dx = pointer.world.x - gesture.start.x;
      const dy = pointer.world.y - gesture.start.y;
      gesture.moved = gesture.moved || dx !== 0 || dy !== 0;
      this.host.scene.upsert(translate(gesture.originals, dx, dy));
      this.host.requestOverlay();
      return;
    }
    gesture.current = pointer.world;
    const rect = boundsFromPoints(gesture.start, gesture.current);
    const touched = this.host.scene
      .query(rect)
      .filter((element) => elementTouchesRect(element, rect))
      .map((element) => element.id);
    this.host.selection.set([...gesture.base, ...touched]);
    this.host.requestOverlay();
  }

  pointerUp(pointer: ToolPointer): void {
    const gesture = this.gesture;
    this.gesture = { kind: 'idle' };
    if (gesture.kind === 'move' && gesture.moved) {
      const dx = pointer.world.x - gesture.start.x;
      const dy = pointer.world.y - gesture.start.y;
      const moved = translate(gesture.originals, dx, dy);
      this.host.scene.upsert(moved);
      this.host.record(new UpdateElements(gesture.originals, moved, 'Mover'));
    }
    this.host.requestOverlay();
  }

  cancel(): void {
    const gesture = this.gesture;
    if (gesture.kind === 'move' && gesture.moved) this.host.scene.upsert(gesture.originals);
    this.gesture = { kind: 'idle' };
    this.host.requestOverlay();
  }

  doubleClick(pointer: ToolPointer): void {
    const hit = findTopElementAt(this.host, pointer.world);
    if (hit?.type === 'text') this.host.beginTextEdit({ element: hit, at: { x: hit.x, y: hit.y } });
  }

  /** Rectángulo de selección en curso. */
  get marquee(): Bounds | null {
    const gesture = this.gesture;
    return gesture.kind === 'marquee' ? boundsFromPoints(gesture.start, gesture.current) : null;
  }

  paintOverlay(ctx: CanvasRenderingContext2D): void {
    const rect = this.marquee;
    if (!rect) return;
    const theme = this.host.theme();
    const zoom = this.host.camera.zoom;
    ctx.fillStyle = theme.selectionFill;
    ctx.fillRect(rect.minX, rect.minY, rect.maxX - rect.minX, rect.maxY - rect.minY);
    ctx.lineWidth = 1 / zoom;
    ctx.strokeStyle = theme.selection;
    ctx.strokeRect(rect.minX, rect.minY, rect.maxX - rect.minX, rect.maxY - rect.minY);
  }

  private updateHoverCursor(at: Point): void {
    const hit = findTopElementAt(this.host, at);
    this.host.setCursor(hit ? 'move' : this.cursor);
  }
}

function translate(elements: readonly Element[], dx: number, dy: number): Element[] {
  return elements.map((element) =>
    updateElement(element, { x: round(element.x + dx), y: round(element.y + dy) }),
  );
}
