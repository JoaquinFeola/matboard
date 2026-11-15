import type { Camera } from '../camera/Camera';
import type { Command } from '../history/commands';
import type { Point } from '../math/vec';
import type { Element } from '../model/element';
import type { SizeKey } from '../model/palette';
import type { CanvasTheme } from '../render/theme';
import type { Scene } from '../scene/Scene';
import type { Selection } from '../editor/Selection';

export type ToolId =
  | 'select'
  | 'hand'
  | 'pen'
  | 'pencil'
  | 'eraser'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'text';

export interface PointerSample {
  x: number;
  y: number;
  pressure: number;
}

/** Evento de puntero ya traducido a coordenadas de mundo. */
export interface ToolPointer {
  world: Point;
  screen: Point;
  /** Muestras intermedias agrupadas por el navegador (en mundo), incluida la última. */
  samples: readonly PointerSample[];
  /** true cuando la presión viene de un lápiz digital. */
  hasPressure: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
}

export interface CurrentStyle {
  color: string;
  sizeKey: SizeKey;
}

export interface TextEditRequest {
  /** Texto existente a editar, o null para uno nuevo. */
  element: Element & { type: 'text' } | null;
  /** Posición en mundo donde empieza el texto. */
  at: Point;
}

/** Lo que el editor ofrece a las herramientas. */
export interface ToolHost {
  readonly scene: Scene;
  readonly camera: Camera;
  readonly selection: Selection;
  theme(): CanvasTheme;
  style(): CurrentStyle;
  execute(command: Command): void;
  record(command: Command): void;
  requestOverlay(): void;
  setCursor(cursor: string): void;
  beginTextEdit(request: TextEditRequest): void;
  /** true si un texto se acaba de confirmar con este mismo clic (para no abrir otro). */
  textEditJustClosed(): boolean;
}

export interface Tool {
  readonly id: ToolId;
  readonly cursor: string;
  pointerDown(pointer: ToolPointer): void;
  /** Se llama también sin botón presionado (para el cursor). */
  pointerMove(pointer: ToolPointer, isDown: boolean): void;
  pointerUp(pointer: ToolPointer): void;
  /** Interrumpe la acción en curso (Esc, pérdida de puntero, cambio de herramienta). */
  cancel(): void;
  doubleClick?(pointer: ToolPointer): void;
  paintOverlay?(ctx: CanvasRenderingContext2D): void;
}
