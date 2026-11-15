import type { ShapeKind } from '../model/element';

/** Superficie para trazar formas: la cumplen `Path2D` y `SvgPath`. */
export interface ShapeSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  rect(x: number, y: number, w: number, h: number): void;
  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number,
    start: number,
    end: number,
  ): void;
}

/** Largo de la punta de flecha según el grosor y el largo del segmento. */
export function arrowHeadLength(size: number, length: number): number {
  return Math.min(Math.max(size * 4, 10), length * 0.4);
}

/** Traza la forma en coordenadas locales (origen = x, y del elemento). */
export function traceShape(sink: ShapeSink, shape: ShapeKind, w: number, h: number, size: number): void {
  switch (shape) {
    case 'rect':
      sink.rect(0, 0, w, h);
      return;
    case 'ellipse':
      sink.ellipse(w / 2, h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
      return;
    case 'line':
      sink.moveTo(0, 0);
      sink.lineTo(w, h);
      return;
    case 'arrow': {
      sink.moveTo(0, 0);
      sink.lineTo(w, h);
      const length = Math.hypot(w, h);
      if (length === 0) return;
      const head = arrowHeadLength(size, length);
      const angle = Math.atan2(h, w);
      const spread = Math.PI / 7;
      sink.moveTo(w - head * Math.cos(angle - spread), h - head * Math.sin(angle - spread));
      sink.lineTo(w, h);
      sink.lineTo(w - head * Math.cos(angle + spread), h - head * Math.sin(angle + spread));
      return;
    }
  }
}
