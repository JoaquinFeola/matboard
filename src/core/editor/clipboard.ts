import { round } from '../math/vec';
import type { Element } from '../model/element';
import { isElement } from '../model/serialize';
import { createId } from '../util/id';

/** Prefijo que identifica elementos de Matboard en el portapapeles del sistema. */
const CLIPBOARD_PREFIX = 'matboard/elements:';

export function toClipboardText(elements: readonly Element[]): string {
  return CLIPBOARD_PREFIX + JSON.stringify(elements);
}

/** Elementos copiados desde Matboard, o null si el texto es otra cosa. */
export function parseClipboardText(text: string): Element[] | null {
  if (!text.startsWith(CLIPBOARD_PREFIX)) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(CLIPBOARD_PREFIX.length));
    return Array.isArray(parsed) ? parsed.filter(isElement) : null;
  } catch {
    return null;
  }
}

/**
 * Copias nuevas desplazadas, con ids nuevos y encima de todo, conservando su
 * orden relativo. Los puntos de los trazos se comparten (son inmutables).
 */
export function cloneElements(
  elements: readonly Element[],
  dx: number,
  dy: number,
  firstZ: number,
): Element[] {
  return [...elements]
    .sort((a, b) => a.z - b.z)
    .map((element, i) => ({
      ...element,
      id: createId(),
      x: round(element.x + dx),
      y: round(element.y + dy),
      z: firstZ + i,
    }));
}
