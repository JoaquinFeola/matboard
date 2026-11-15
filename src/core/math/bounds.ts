import type { Point } from './vec';

/** Rectángulo alineado a los ejes. Misma forma que espera rbush. */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const EMPTY_BOUNDS: Readonly<Bounds> = Object.freeze({
  minX: Infinity,
  minY: Infinity,
  maxX: -Infinity,
  maxY: -Infinity,
});

export const isEmpty = (b: Bounds): boolean => b.minX > b.maxX || b.minY > b.maxY;

export const boundsWidth = (b: Bounds): number => b.maxX - b.minX;
export const boundsHeight = (b: Bounds): number => b.maxY - b.minY;

export function boundsFromPoints(a: Point, b: Point): Bounds {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

export function union(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function unionAll(list: Iterable<Bounds>): Bounds {
  let result: Bounds = { ...EMPTY_BOUNDS };
  for (const b of list) result = union(result, b);
  return result;
}

export function expand(b: Bounds, amount: number): Bounds {
  return {
    minX: b.minX - amount,
    minY: b.minY - amount,
    maxX: b.maxX + amount,
    maxY: b.maxY + amount,
  };
}

export function intersects(a: Bounds, b: Bounds): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function containsPoint(b: Bounds, x: number, y: number): boolean {
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}
