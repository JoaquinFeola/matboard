import type { BackgroundKind } from '../model/board';
import type { CanvasTheme } from './theme';

/** Tamaño del cuadro/renglón en unidades de mundo (≈ 5 mm de cuaderno a 100%). */
export const PAPER_SPACING = 28;
const MAJOR_EVERY = 5;
/** Separación mínima en píxeles físicos antes de agrupar líneas. */
const MIN_SPACING_PX = 9;

export interface BackgroundView {
  /** Origen del mundo visible y zoom. */
  x: number;
  y: number;
  zoom: number;
  /** Tamaño del área en píxeles físicos y densidad. */
  width: number;
  height: number;
  dpr: number;
}

/**
 * Dibuja el patrón en píxeles físicos (sin transformación) para que las
 * líneas de 1 px queden alineadas y nítidas en cualquier zoom.
 */
export function paintBackground(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  kind: BackgroundKind,
  view: BackgroundView,
  theme: CanvasTheme,
): void {
  ctx.fillStyle = theme.paper;
  ctx.fillRect(0, 0, view.width, view.height);
  if (kind === 'blank') return;

  const scale = view.zoom * view.dpr;
  let step = PAPER_SPACING;
  while (step * scale < MIN_SPACING_PX) step *= MAJOR_EVERY;
  const stepPx = step * scale;
  const majorStep = step * MAJOR_EVERY;

  const firstX = Math.floor(view.x / step) * step;
  const firstY = Math.floor(view.y / step) * step;
  const toPxX = (wx: number) => Math.round((wx - view.x) * scale) + 0.5;
  const toPxY = (wy: number) => Math.round((wy - view.y) * scale) + 0.5;
  const isMajor = (w: number) => Math.abs(w / majorStep - Math.round(w / majorStep)) < 1e-6;
  const lineWidth = Math.max(1, Math.round(view.dpr));

  if (kind === 'dots') {
    const radius = Math.max(0.9, Math.min(2, stepPx / 18)) * view.dpr;
    const dots = new Path2D();
    for (let wy = firstY; toPxY(wy) < view.height + stepPx; wy += step) {
      for (let wx = firstX; toPxX(wx) < view.width + stepPx; wx += step) {
        const px = toPxX(wx);
        const py = toPxY(wy);
        dots.moveTo(px + radius, py);
        dots.arc(px, py, radius, 0, Math.PI * 2);
      }
    }
    ctx.fillStyle = theme.gridMajor;
    ctx.fill(dots);
    return;
  }

  const minor = new Path2D();
  const major = new Path2D();
  for (let wy = firstY; toPxY(wy) < view.height + stepPx; wy += step) {
    const target = kind === 'grid' && isMajor(wy) ? major : minor;
    const py = toPxY(wy);
    target.moveTo(0, py);
    target.lineTo(view.width, py);
  }
  if (kind === 'grid') {
    for (let wx = firstX; toPxX(wx) < view.width + stepPx; wx += step) {
      const target = isMajor(wx) ? major : minor;
      const px = toPxX(wx);
      target.moveTo(px, 0);
      target.lineTo(px, view.height);
    }
  }
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = kind === 'lined' ? theme.gridMajor : theme.gridMinor;
  ctx.stroke(minor);
  ctx.strokeStyle = theme.gridMajor;
  ctx.stroke(major);

  if (kind === 'lined') {
    // Margen de cuaderno en x = 0 del mundo.
    const mx = toPxX(0);
    if (mx >= 0 && mx <= view.width) {
      ctx.strokeStyle = theme.margin;
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, view.height);
      ctx.stroke();
    }
  }
}
