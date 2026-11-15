import { getStroke, type StrokeOptions } from 'perfect-freehand';
import { STROKE_POINT_STRIDE, type StrokeVariant } from '../model/element';

/** Superficie mínima para trazar un contorno: la cumplen `Path2D`, el contexto 2D y `SvgPath`. */
export interface PathSink {
  moveTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  closePath(): void;
}

const VARIANT_OPTIONS: Record<StrokeVariant, Omit<StrokeOptions, 'size' | 'simulatePressure' | 'last'>> = {
  // Pluma: el grosor responde mucho a la presión, con puntas suaves.
  pen: {
    thinning: 0.62,
    smoothing: 0.55,
    streamline: 0.45,
    easing: (t) => Math.sin((t * Math.PI) / 2),
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true },
  },
  // Lápiz: grosor casi parejo, fino.
  pencil: {
    thinning: 0.18,
    smoothing: 0.6,
    streamline: 0.4,
    start: { cap: true },
    end: { cap: true },
  },
};

export const PENCIL_OPACITY = 0.88;

/** Convierte puntos planos [x,y,p,...] en la lista que espera perfect-freehand. */
function toInputPoints(points: readonly number[]): number[][] {
  const input: number[][] = new Array(points.length / STROKE_POINT_STRIDE);
  for (let i = 0, j = 0; i < points.length; i += STROKE_POINT_STRIDE, j++) {
    input[j] = [points[i], points[i + 1], points[i + 2]];
  }
  return input;
}

export function computeOutline(
  points: readonly number[],
  variant: StrokeVariant,
  size: number,
  hasPressure: boolean,
  complete: boolean,
): number[][] {
  return getStroke(toInputPoints(points), {
    ...VARIANT_OPTIONS[variant],
    size,
    simulatePressure: !hasPressure,
    last: complete,
  });
}

/**
 * Traza el polígono del contorno con curvas cuadráticas entre puntos medios,
 * lo que da bordes suaves sin aumentar la cantidad de puntos.
 */
export function traceOutline(sink: PathSink, outline: readonly number[][]): void {
  const n = outline.length;
  if (n < 2) return;
  const [x0, y0] = outline[0];
  const [x1, y1] = outline[1];
  sink.moveTo((x0 + x1) / 2, (y0 + y1) / 2);
  for (let i = 1; i <= n; i++) {
    const [cx, cy] = outline[i % n];
    const [nx, ny] = outline[(i + 1) % n];
    sink.quadraticCurveTo(cx, cy, (cx + nx) / 2, (cy + ny) / 2);
  }
  sink.closePath();
}
