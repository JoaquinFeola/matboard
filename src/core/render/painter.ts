import type { Element, ShapeElement, StrokeElement, TextElement } from '../model/element';
import { computeOutline, PENCIL_OPACITY, traceOutline } from './strokeOutline';
import { traceShape } from './shapePath';
import { fontFor, TEXT_LINE_HEIGHT } from './text';
import type { CanvasTheme } from './theme';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Caché de `Path2D` por geometría. La clave es el arreglo de puntos (que se
 * comparte entre copias al mover), así mover un trazo no recalcula su contorno.
 */
interface CachedStroke {
  size: number;
  path: Path2D;
}
const strokeCache = new WeakMap<readonly number[], CachedStroke>();

function strokePath(stroke: StrokeElement): Path2D {
  const cached = strokeCache.get(stroke.points);
  if (cached && cached.size === stroke.size) return cached.path;
  const path = new Path2D();
  traceOutline(path, computeOutline(stroke.points, stroke.variant, stroke.size, stroke.pressure, true));
  strokeCache.set(stroke.points, { size: stroke.size, path });
  return path;
}

export function paintElement(ctx: Ctx, element: Element, theme: CanvasTheme): void {
  ctx.save();
  ctx.translate(element.x, element.y);
  switch (element.type) {
    case 'stroke':
      paintStroke(ctx, element, theme);
      break;
    case 'shape':
      paintShape(ctx, element, theme);
      break;
    case 'text':
      paintText(ctx, element, theme);
      break;
  }
  ctx.restore();
}

function paintStroke(ctx: Ctx, stroke: StrokeElement, theme: CanvasTheme): void {
  ctx.fillStyle = theme.mapColor(stroke.color);
  if (stroke.variant === 'pencil') ctx.globalAlpha = PENCIL_OPACITY;
  ctx.fill(strokePath(stroke));
}

/** Pinta un trazo que todavía se está dibujando (sin caché). */
export function paintLiveStroke(
  ctx: Ctx,
  points: readonly number[],
  stroke: Pick<StrokeElement, 'variant' | 'size' | 'color' | 'pressure'>,
  theme: CanvasTheme,
): void {
  const path = new Path2D();
  traceOutline(path, computeOutline(points, stroke.variant, stroke.size, stroke.pressure, false));
  ctx.save();
  ctx.fillStyle = theme.mapColor(stroke.color);
  if (stroke.variant === 'pencil') ctx.globalAlpha = PENCIL_OPACITY;
  ctx.fill(path);
  ctx.restore();
}

function paintShape(ctx: Ctx, shape: ShapeElement, theme: CanvasTheme): void {
  const path = new Path2D();
  traceShape(path, shape.shape, shape.w, shape.h, shape.size);
  ctx.strokeStyle = theme.mapColor(shape.color);
  ctx.lineWidth = shape.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(path);
}

function paintText(ctx: Ctx, text: TextElement, theme: CanvasTheme): void {
  ctx.fillStyle = theme.mapColor(text.color);
  ctx.font = fontFor(text.size);
  ctx.textBaseline = 'top';
  const lineHeight = text.size * TEXT_LINE_HEIGHT;
  const offset = (lineHeight - text.size) / 2;
  text.text.split('\n').forEach((line, i) => ctx.fillText(line, 0, i * lineHeight + offset));
}
