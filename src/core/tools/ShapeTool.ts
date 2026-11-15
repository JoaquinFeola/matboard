import { AddElements } from '../history/commands';
import { round, snapToAngle, type Point } from '../math/vec';
import type { ShapeElement, ShapeKind } from '../model/element';
import { SIZE_TABLE } from '../model/palette';
import { paintElement } from '../render/painter';
import { createId } from '../util/id';
import type { Tool, ToolHost, ToolPointer } from './types';

/** Tamaño mínimo en pantalla para que un arrastre cuente como forma. */
const MIN_SHAPE_PX = 3;

export class ShapeTool implements Tool {
  readonly cursor = 'crosshair';
  private origin: Point | null = null;
  private preview: ShapeElement | null = null;

  constructor(
    readonly id: ShapeKind,
    private readonly host: ToolHost,
  ) {}

  pointerDown(pointer: ToolPointer): void {
    this.origin = pointer.world;
    this.preview = null;
  }

  pointerMove(pointer: ToolPointer, isDown: boolean): void {
    if (!isDown || !this.origin) return;
    this.preview = this.buildShape(this.origin, pointer.world, pointer.shiftKey);
    this.host.requestOverlay();
  }

  pointerUp(pointer: ToolPointer): void {
    if (!this.origin) return;
    const shape = this.buildShape(this.origin, pointer.world, pointer.shiftKey);
    this.origin = null;
    this.preview = null;
    const minSize = MIN_SHAPE_PX / this.host.camera.zoom;
    if (Math.max(Math.abs(shape.w), Math.abs(shape.h)) >= minSize) {
      this.host.execute(new AddElements([shape]));
    }
    this.host.requestOverlay();
  }

  cancel(): void {
    this.origin = null;
    this.preview = null;
    this.host.requestOverlay();
  }

  paintOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.preview) paintElement(ctx, this.preview, this.host.theme());
  }

  /** Shift: cuadrado/círculo en rect/elipse, ángulos de 45° en línea/flecha. */
  private buildShape(from: Point, to: Point, constrain: boolean): ShapeElement {
    let dx = to.x - from.x;
    let dy = to.y - from.y;
    const isLinear = this.id === 'line' || this.id === 'arrow';
    if (constrain) {
      if (isLinear) {
        ({ x: dx, y: dy } = snapToAngle(dx, dy));
      } else {
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        dx = Math.sign(dx || 1) * side;
        dy = Math.sign(dy || 1) * side;
      }
    }
    const style = this.host.style();
    const base = {
      id: createId(),
      type: 'shape' as const,
      shape: this.id,
      z: this.host.scene.nextZ(),
      color: style.color,
      size: SIZE_TABLE.shape[style.sizeKey],
    };
    if (isLinear) {
      return { ...base, x: round(from.x), y: round(from.y), w: round(dx), h: round(dy) };
    }
    // Rect y elipse se normalizan a ancho/alto positivos.
    return {
      ...base,
      x: round(Math.min(from.x, from.x + dx)),
      y: round(Math.min(from.y, from.y + dy)),
      w: round(Math.abs(dx)),
      h: round(Math.abs(dy)),
    };
  }
}
