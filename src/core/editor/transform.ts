import { round, rotatePoint, type Point } from '../math/vec';
import { STROKE_POINT_STRIDE, updateElement, type Element } from '../model/element';
import { elementCenter } from '../model/geometry';

/**
 * Escala elementos respecto de un ancla del mundo. Cada elemento se escala en
 * su propio marco (sin rotar) y su centro se mueve con el grupo; un factor
 * negativo lo espeja. Los textos escalan su letra de forma uniforme.
 */
export function scaleElements(elements: readonly Element[], anchor: Point, sx: number, sy: number): Element[] {
  return elements.map((element) => {
    const center = elementCenter(element);
    const nextCenter = {
      x: anchor.x + (center.x - anchor.x) * sx,
      y: anchor.y + (center.y - anchor.y) * sy,
    };
    const scaled = scaleGeometry(element, sx, sy);
    return updateElement(scaled, {
      x: round(nextCenter.x - scaled.w / 2),
      y: round(nextCenter.y - scaled.h / 2),
    });
  });
}

function scaleGeometry(element: Element, sx: number, sy: number): Element {
  const ax = Math.abs(sx);
  const ay = Math.abs(sy);
  switch (element.type) {
    case 'stroke': {
      const { points, w, h } = element;
      const next: number[] = new Array(points.length);
      for (let i = 0; i < points.length; i += STROKE_POINT_STRIDE) {
        const px = sx < 0 ? w - points[i] : points[i];
        const py = sy < 0 ? h - points[i + 1] : points[i + 1];
        next[i] = round(px * ax);
        next[i + 1] = round(py * ay);
        next[i + 2] = points[i + 2];
      }
      return updateElement(element, { points: next, w: round(w * ax), h: round(h * ay) });
    }
    case 'shape': {
      const linear = element.shape === 'line' || element.shape === 'arrow';
      return linear
        ? updateElement(element, { w: round(element.w * sx), h: round(element.h * sy) })
        : updateElement(element, { w: round(element.w * ax), h: round(element.h * ay) });
    }
    case 'image':
      return updateElement(element, { w: round(element.w * ax), h: round(element.h * ay) });
    case 'text': {
      const s = Math.max(ax, ay);
      return updateElement(element, {
        size: round(Math.max(4, element.size * s)),
        w: round(element.w * s),
        h: round(element.h * s),
      });
    }
  }
}

/** Rota elementos alrededor de un pivote, sumando `delta` a su ángulo. */
export function rotateElements(elements: readonly Element[], pivot: Point, delta: number): Element[] {
  return elements.map((element) => {
    const center = elementCenter(element);
    const next = rotatePoint(center.x, center.y, pivot.x, pivot.y, delta);
    return updateElement(element, {
      x: round(next.x - element.w / 2),
      y: round(next.y - element.h / 2),
      angle: normalizeAngle((element.angle ?? 0) + delta),
    });
  });
}

/** Ángulo en [−π, π), redondeado para que se guarde compacto. */
export function normalizeAngle(angle: number): number {
  const full = Math.PI * 2;
  const wrapped = ((((angle + Math.PI) % full) + full) % full) - Math.PI;
  return round(wrapped, 5);
}
