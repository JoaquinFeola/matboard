import { Circle, Eraser, Hand, Minus, MousePointer2, MoveUpRight, Pen, Pencil, Square, Type } from 'lucide-solid';
import type { JSX } from 'solid-js';
import type { ToolId } from '@/core/tools/types';

export interface ToolDef {
  id: ToolId;
  label: string;
  shortcut: string;
  icon: (size: number) => JSX.Element;
}

const def = (id: ToolId, label: string, shortcut: string, Icon: typeof Pen): ToolDef => ({
  id,
  label,
  shortcut,
  icon: (size) => <Icon size={size} stroke-width={1.75} />,
});

export const NAV_TOOLS: readonly ToolDef[] = [
  def('select', 'Seleccionar', 'V', MousePointer2),
  def('hand', 'Mano', 'H', Hand),
];

export const DRAW_TOOLS: readonly ToolDef[] = [
  def('pen', 'Pluma', 'P', Pen),
  def('pencil', 'Lápiz', 'B', Pencil),
  def('eraser', 'Goma', 'E', Eraser),
];

export const SHAPE_TOOLS: readonly ToolDef[] = [
  def('rect', 'Rectángulo', 'R', Square),
  def('ellipse', 'Elipse', 'O', Circle),
  def('line', 'Línea', 'L', Minus),
  def('arrow', 'Flecha', 'A', MoveUpRight),
];

export const TEXT_TOOL: ToolDef = def('text', 'Texto', 'T', Type);

export const isShapeTool = (id: ToolId): boolean => SHAPE_TOOLS.some((t) => t.id === id);
