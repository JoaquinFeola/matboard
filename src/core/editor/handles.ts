import { expand, unionAll, type Bounds } from '../math/bounds';
import type { Point } from '../math/vec';
import type { Element } from '../model/element';
import { getElementBounds } from '../model/geometry';
import type { CanvasTheme } from '../render/theme';

/** Manijas de la caja de selección: esquinas, lados y rotación. */
export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

const HANDLE_PX = 8;
const HIT_PX = 9;
const ROTATE_OFFSET_PX = 26;
const FRAME_PADDING_PX = 4;

export const HANDLE_CURSORS: Record<HandleId, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  rotate: 'grab',
};

/** Caja que encierra la selección, con margen en pantalla. */
export function selectionFrame(elements: readonly Element[], zoom: number): Bounds {
  return expand(unionAll(elements.map(getElementBounds)), FRAME_PADDING_PX / zoom);
}

export function handlePositions(frame: Bounds, zoom: number): Record<HandleId, Point> {
  const { minX, minY, maxX, maxY } = frame;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    nw: { x: minX, y: minY },
    n: { x: cx, y: minY },
    ne: { x: maxX, y: minY },
    e: { x: maxX, y: cy },
    se: { x: maxX, y: maxY },
    s: { x: cx, y: maxY },
    sw: { x: minX, y: maxY },
    w: { x: minX, y: cy },
    rotate: { x: cx, y: minY - ROTATE_OFFSET_PX / zoom },
  };
}

/** Las manijas de los lados se ocultan si la caja es muy chica en pantalla. */
function visibleHandles(frame: Bounds, zoom: number): HandleId[] {
  const small = (frame.maxX - frame.minX) * zoom < 40 || (frame.maxY - frame.minY) * zoom < 40;
  return small ? ['nw', 'ne', 'se', 'sw', 'rotate'] : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rotate'];
}

export function hitHandle(frame: Bounds, zoom: number, at: Point): HandleId | null {
  const positions = handlePositions(frame, zoom);
  const reach = HIT_PX / zoom;
  for (const id of visibleHandles(frame, zoom)) {
    const p = positions[id];
    if (Math.abs(at.x - p.x) <= reach && Math.abs(at.y - p.y) <= reach) return id;
  }
  return null;
}

/** Punto fijo al arrastrar una manija: el opuesto. */
export function oppositeAnchor(frame: Bounds, handle: HandleId): Point {
  const { minX, minY, maxX, maxY } = frame;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const x = handle.includes('w') ? maxX : handle.includes('e') ? minX : cx;
  const y = handle.startsWith('n') ? maxY : handle.startsWith('s') ? minY : cy;
  return { x, y };
}

export function paintSelectionFrame(
  ctx: CanvasRenderingContext2D,
  elements: readonly Element[],
  zoom: number,
  theme: CanvasTheme,
  withHandles: boolean,
): void {
  if (elements.length === 0) return;
  const px = 1 / zoom;
  ctx.strokeStyle = theme.selection;

  if (elements.length > 1) {
    ctx.lineWidth = px;
    ctx.setLineDash([4 * px, 3 * px]);
    for (const element of elements) {
      const b = expand(getElementBounds(element), 2 * px);
      ctx.strokeRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
    }
    ctx.setLineDash([]);
  }

  const frame = selectionFrame(elements, zoom);
  ctx.fillStyle = theme.selectionFill;
  ctx.fillRect(frame.minX, frame.minY, frame.maxX - frame.minX, frame.maxY - frame.minY);
  ctx.lineWidth = 1.5 * px;
  ctx.strokeRect(frame.minX, frame.minY, frame.maxX - frame.minX, frame.maxY - frame.minY);
  if (!withHandles) return;

  const positions = handlePositions(frame, zoom);
  const half = (HANDLE_PX / 2) * px;
  ctx.beginPath();
  ctx.moveTo(positions.n.x, frame.minY);
  ctx.lineTo(positions.rotate.x, positions.rotate.y);
  ctx.stroke();
  ctx.fillStyle = theme.paper;
  ctx.lineWidth = 1.5 * px;
  for (const id of visibleHandles(frame, zoom)) {
    const p = positions[id];
    ctx.beginPath();
    if (id === 'rotate') ctx.arc(p.x, p.y, half * 1.1, 0, Math.PI * 2);
    else ctx.roundRect(p.x - half, p.y - half, half * 2, half * 2, 2 * px);
    ctx.fill();
    ctx.stroke();
  }
}
