export interface Point {
  x: number;
  y: number;
}

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Distancia del punto `p` al segmento `a`–`b`. */
export function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Ajusta el vector a múltiplos de 45° (Shift en líneas y flechas). */
export function snapToAngle(dx: number, dy: number, stepRad = Math.PI / 4): Point {
  const length = Math.hypot(dx, dy);
  const angle = Math.round(Math.atan2(dy, dx) / stepRad) * stepRad;
  return { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
}

/** Rota (x, y) alrededor de (cx, cy). */
export function rotatePoint(x: number, y: number, cx: number, cy: number, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

export const round = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};
