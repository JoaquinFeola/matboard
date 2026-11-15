import type { Point } from '../math/vec';
import type { Element } from '../model/element';
import { hitTestElement } from '../model/geometry';
import type { ToolHost } from './types';

/** Tolerancia de clic en píxeles de pantalla. */
export const PICK_TOLERANCE_PX = 6;

/** El elemento más arriba bajo el punto, o null. */
export function findTopElementAt(host: Pick<ToolHost, 'scene' | 'camera'>, at: Point): Element | null {
  const tolerance = PICK_TOLERANCE_PX / host.camera.zoom;
  const candidates = host.scene.query({
    minX: at.x - tolerance,
    minY: at.y - tolerance,
    maxX: at.x + tolerance,
    maxY: at.y + tolerance,
  });
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (hitTestElement(candidates[i], at.x, at.y, { tolerance, includeInterior: true })) {
      return candidates[i];
    }
  }
  return null;
}
