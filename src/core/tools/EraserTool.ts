import { RemoveElements } from '../history/commands';
import type { Point } from '../math/vec';
import type { Element } from '../model/element';
import { hitTestElement } from '../model/geometry';
import type { Tool, ToolHost, ToolPointer } from './types';

/** Radio de la goma en píxeles de pantalla. */
export const ERASER_RADIUS_PX = 9;

/** Borra elementos completos al pasar por encima; todo el gesto es un solo "deshacer". */
export class EraserTool implements Tool {
  readonly id = 'eraser';
  readonly cursor = 'none';
  private erased: Element[] = [];
  private erasing = false;
  private last: Point | null = null;
  private cursorAt: Point | null = null;

  constructor(private readonly host: ToolHost) {}

  pointerDown(pointer: ToolPointer): void {
    this.erasing = true;
    this.erased = [];
    this.last = pointer.world;
    this.eraseAlong(pointer.world, pointer.world);
  }

  pointerMove(pointer: ToolPointer, isDown: boolean): void {
    this.cursorAt = pointer.world;
    if (isDown && this.erasing && this.last) {
      this.eraseAlong(this.last, pointer.world);
      this.last = pointer.world;
    }
    this.host.requestOverlay();
  }

  pointerUp(): void {
    if (!this.erasing) return;
    this.erasing = false;
    this.last = null;
    if (this.erased.length > 0) this.host.record(new RemoveElements(this.erased));
    this.erased = [];
  }

  cancel(): void {
    this.pointerUp();
    this.cursorAt = null;
    this.host.requestOverlay();
  }

  paintOverlay(ctx: CanvasRenderingContext2D): void {
    if (!this.cursorAt) return;
    const zoom = this.host.camera.zoom;
    ctx.beginPath();
    ctx.arc(this.cursorAt.x, this.cursorAt.y, ERASER_RADIUS_PX / zoom, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.18)';
    ctx.fill();
    ctx.lineWidth = 1.25 / zoom;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.9)';
    ctx.stroke();
  }

  /** Recorre el segmento entre dos posiciones para no saltear trazos con movimientos rápidos. */
  private eraseAlong(from: Point, to: Point): void {
    const radius = ERASER_RADIUS_PX / this.host.camera.zoom;
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (radius / 2)));
    const hits: Element[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const area = { minX: x - radius, minY: y - radius, maxX: x + radius, maxY: y + radius };
      for (const element of this.host.scene.query(area)) {
        if (hits.includes(element)) continue;
        if (hitTestElement(element, x, y, { tolerance: radius, includeInterior: false })) {
          hits.push(element);
        }
      }
    }
    if (hits.length === 0) return;
    this.erased.push(...hits);
    this.host.scene.remove(hits.map((e) => e.id));
  }
}
