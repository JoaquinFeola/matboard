import { containsPoint, expand, intersects, type Bounds } from '../math/bounds';
import { distanceToSegment, rotatePoint, type Point } from '../math/vec';
import {
  STROKE_POINT_STRIDE,
  type Element,
  type ShapeElement,
  type StrokeElement,
} from './element';

/** Centro de la caja local del elemento, en mundo (pivote de su rotación). */
export function elementCenter(element: Element): Point {
  return { x: element.x + element.w / 2, y: element.y + element.h / 2 };
}

/** Límites en mundo, incluyendo el grosor del trazo y la rotación. */
export function getElementBounds(element: Element): Bounds {
  const local = getUnrotatedBounds(element);
  const angle = element.angle ?? 0;
  if (angle === 0) return local;
  const c = elementCenter(element);
  const corners = [
    rotatePoint(local.minX, local.minY, c.x, c.y, angle),
    rotatePoint(local.maxX, local.minY, c.x, c.y, angle),
    rotatePoint(local.maxX, local.maxY, c.x, c.y, angle),
    rotatePoint(local.minX, local.maxY, c.x, c.y, angle),
  ];
  return {
    minX: Math.min(...corners.map((p) => p.x)),
    minY: Math.min(...corners.map((p) => p.y)),
    maxX: Math.max(...corners.map((p) => p.x)),
    maxY: Math.max(...corners.map((p) => p.y)),
  };
}

/** Límites sin rotar (en el marco del elemento, ubicado en mundo). */
function getUnrotatedBounds(element: Element): Bounds {
  const { x, y } = element;
  switch (element.type) {
    case 'stroke':
      return expand({ minX: x, minY: y, maxX: x + element.w, maxY: y + element.h }, element.size);
    case 'shape': {
      const box = {
        minX: Math.min(x, x + element.w),
        minY: Math.min(y, y + element.h),
        maxX: Math.max(x, x + element.w),
        maxY: Math.max(y, y + element.h),
      };
      // Las flechas tienen una punta que sobresale del segmento.
      const extra = element.shape === 'arrow' ? element.size * 4 : element.size;
      return expand(box, extra);
    }
    case 'text':
    case 'image':
      return { minX: x, minY: y, maxX: x + element.w, maxY: y + element.h };
  }
}

export interface HitOptions {
  /** Tolerancia en unidades de mundo. */
  tolerance: number;
  /** Si el interior de rectángulos, elipses y textos cuenta como acierto. */
  includeInterior: boolean;
}

/** Lleva un punto del mundo al marco sin rotar del elemento. */
function toUnrotated(element: Element, px: number, py: number): Point {
  const angle = element.angle ?? 0;
  if (angle === 0) return { x: px, y: py };
  const c = elementCenter(element);
  return rotatePoint(px, py, c.x, c.y, -angle);
}

export function hitTestElement(element: Element, wx: number, wy: number, options: HitOptions): boolean {
  const { x: px, y: py } = toUnrotated(element, wx, wy);
  if (!containsPoint(expand(getUnrotatedBounds(element), options.tolerance), px, py)) return false;
  switch (element.type) {
    case 'stroke':
      return hitStroke(element, px - element.x, py - element.y, options.tolerance);
    case 'shape':
      return hitShape(element, px - element.x, py - element.y, options);
    case 'text':
    case 'image':
      return true;
  }
}

function hitStroke(stroke: StrokeElement, lx: number, ly: number, tolerance: number): boolean {
  const { points } = stroke;
  const reach = tolerance + stroke.size / 2;
  if (points.length <= STROKE_POINT_STRIDE) {
    return Math.hypot(lx - (points[0] ?? 0), ly - (points[1] ?? 0)) <= reach;
  }
  for (let i = STROKE_POINT_STRIDE; i < points.length; i += STROKE_POINT_STRIDE) {
    const d = distanceToSegment(
      lx,
      ly,
      points[i - STROKE_POINT_STRIDE],
      points[i - STROKE_POINT_STRIDE + 1],
      points[i],
      points[i + 1],
    );
    if (d <= reach) return true;
  }
  return false;
}

function hitShape(shape: ShapeElement, lx: number, ly: number, options: HitOptions): boolean {
  const reach = options.tolerance + shape.size / 2;
  const { w, h } = shape;
  switch (shape.shape) {
    case 'line':
    case 'arrow':
      return distanceToSegment(lx, ly, 0, 0, w, h) <= reach;
    case 'rect': {
      const inside = lx >= 0 && lx <= w && ly >= 0 && ly <= h;
      if (inside && options.includeInterior) return true;
      const edge = Math.min(
        distanceToSegment(lx, ly, 0, 0, w, 0),
        distanceToSegment(lx, ly, w, 0, w, h),
        distanceToSegment(lx, ly, w, h, 0, h),
        distanceToSegment(lx, ly, 0, h, 0, 0),
      );
      return edge <= reach;
    }
    case 'ellipse': {
      const rx = w / 2;
      const ry = h / 2;
      if (rx === 0 || ry === 0) return distanceToSegment(lx, ly, 0, 0, w, h) <= reach;
      const nx = (lx - rx) / rx;
      const ny = (ly - ry) / ry;
      const radial = Math.hypot(nx, ny);
      if (radial <= 1 && options.includeInterior) return true;
      // Aproximación de la distancia al borde.
      return Math.abs(radial - 1) * Math.min(rx, ry) <= reach;
    }
  }
}

/** Si el elemento queda alcanzado por un rectángulo de selección. */
export function elementTouchesRect(element: Element, rect: Bounds): boolean {
  if (!intersects(getElementBounds(element), rect)) return false;
  if (element.type !== 'stroke') return true;
  const { points, x, y } = element;
  const angle = element.angle ?? 0;
  const c = elementCenter(element);
  for (let i = 0; i < points.length; i += STROKE_POINT_STRIDE) {
    const p =
      angle === 0
        ? { x: x + points[i], y: y + points[i + 1] }
        : rotatePoint(x + points[i], y + points[i + 1], c.x, c.y, angle);
    if (containsPoint(rect, p.x, p.y)) return true;
  }
  return false;
}
