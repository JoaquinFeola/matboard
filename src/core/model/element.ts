/**
 * Elementos de una pizarra. Son inmutables: toda modificación crea un objeto nuevo
 * (ver `updateElement`), lo que permite deshacer guardando el antes y el después.
 */

export type ElementId = string;

interface BaseElement {
  readonly id: ElementId;
  /** Posición en coordenadas de mundo; la geometría es relativa a este punto. */
  readonly x: number;
  readonly y: number;
  /** Orden de dibujo: mayor se dibuja encima. */
  readonly z: number;
  readonly color: string;
  /** Grosor del trazo (o tamaño de letra en texto), en unidades de mundo. */
  readonly size: number;
}

export type StrokeVariant = 'pen' | 'pencil';

export interface StrokeElement extends BaseElement {
  readonly type: 'stroke';
  readonly variant: StrokeVariant;
  /** Plano: [x0, y0, p0, x1, y1, p1, ...] relativo a (x, y). */
  readonly points: readonly number[];
  /** true si la presión vino del lápiz digital; false si se simula. */
  readonly pressure: boolean;
  /** Ancho y alto de la caja de los puntos (sin grosor). */
  readonly w: number;
  readonly h: number;
}

export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'arrow';

export interface ShapeElement extends BaseElement {
  readonly type: 'shape';
  readonly shape: ShapeKind;
  /** Rect/elipse: siempre positivos. Línea/flecha: vector al extremo, puede ser negativo. */
  readonly w: number;
  readonly h: number;
}

export interface TextElement extends BaseElement {
  readonly type: 'text';
  readonly text: string;
  /** Medidas del texto renderizado; se calculan al confirmar la edición. */
  readonly w: number;
  readonly h: number;
}

export type Element = StrokeElement | ShapeElement | TextElement;
export type ElementType = Element['type'];

/** Copia el elemento con cambios. Preserva referencias (p. ej. `points`) que no cambian. */
export function updateElement<T extends Element>(element: T, changes: Partial<T>): T {
  return { ...element, ...changes };
}

export const STROKE_POINT_STRIDE = 3;
