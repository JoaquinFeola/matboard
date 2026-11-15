import { AddElements } from '../history/commands';
import { round } from '../math/vec';
import { STROKE_POINT_STRIDE, type StrokeElement, type StrokeVariant } from '../model/element';
import { SIZE_TABLE } from '../model/palette';
import { paintLiveStroke } from '../render/painter';
import { createId } from '../util/id';
import type { Tool, ToolHost, ToolPointer } from './types';

/** Distancia mínima entre muestras, en píxeles de pantalla. Filtra ruido sin perder detalle. */
const MIN_SAMPLE_DISTANCE_PX = 0.4;

/** Pluma y lápiz: misma mecánica, distinto perfil de trazo. */
export class PenTool implements Tool {
  readonly cursor = 'crosshair';
  private points: number[] = [];
  private hasPressure = false;
  private drawing = false;

  constructor(
    readonly id: 'pen' | 'pencil',
    private readonly host: ToolHost,
  ) {}

  private get variant(): StrokeVariant {
    return this.id;
  }

  pointerDown(pointer: ToolPointer): void {
    this.drawing = true;
    this.hasPressure = pointer.hasPressure;
    this.points = [];
    this.addSamples(pointer);
  }

  pointerMove(pointer: ToolPointer, isDown: boolean): void {
    if (!isDown || !this.drawing) return;
    this.addSamples(pointer);
  }

  pointerUp(pointer: ToolPointer): void {
    if (!this.drawing) return;
    this.addSamples(pointer);
    this.drawing = false;
    const element = this.buildElement();
    this.points = [];
    if (element) this.host.execute(new AddElements([element]));
    this.host.requestOverlay();
  }

  cancel(): void {
    this.drawing = false;
    this.points = [];
    this.host.requestOverlay();
  }

  paintOverlay(ctx: CanvasRenderingContext2D): void {
    if (!this.drawing || this.points.length === 0) return;
    const { color } = this.host.style();
    paintLiveStroke(
      ctx,
      this.points,
      { variant: this.variant, size: this.size(), color, pressure: this.hasPressure },
      this.host.theme(),
    );
  }

  private size(): number {
    return SIZE_TABLE[this.variant][this.host.style().sizeKey];
  }

  private addSamples(pointer: ToolPointer): void {
    const minDistance = MIN_SAMPLE_DISTANCE_PX / this.host.camera.zoom;
    for (const sample of pointer.samples) {
      const n = this.points.length;
      if (n > 0) {
        const dx = sample.x - this.points[n - STROKE_POINT_STRIDE];
        const dy = sample.y - this.points[n - STROKE_POINT_STRIDE + 1];
        if (Math.hypot(dx, dy) < minDistance) continue;
      }
      this.points.push(sample.x, sample.y, this.hasPressure ? sample.pressure : 0.5);
    }
    this.host.requestOverlay();
  }

  /** Pasa los puntos a coordenadas relativas y redondeadas para guardar compacto. */
  private buildElement(): StrokeElement | null {
    const pts = this.points;
    if (pts.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < pts.length; i += STROKE_POINT_STRIDE) {
      minX = Math.min(minX, pts[i]);
      minY = Math.min(minY, pts[i + 1]);
      maxX = Math.max(maxX, pts[i]);
      maxY = Math.max(maxY, pts[i + 1]);
    }
    const relative: number[] = new Array(pts.length);
    for (let i = 0; i < pts.length; i += STROKE_POINT_STRIDE) {
      relative[i] = round(pts[i] - minX);
      relative[i + 1] = round(pts[i + 1] - minY);
      relative[i + 2] = round(pts[i + 2], 3);
    }
    const { color } = this.host.style();
    return {
      id: createId(),
      type: 'stroke',
      variant: this.variant,
      x: round(minX),
      y: round(minY),
      z: this.host.scene.nextZ(),
      color,
      size: this.size(),
      points: relative,
      pressure: this.hasPressure,
      w: round(maxX - minX),
      h: round(maxY - minY),
    };
  }
}
