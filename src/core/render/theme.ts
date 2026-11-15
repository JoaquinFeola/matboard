import { INK } from '../model/palette';

/** Colores que usa el canvas; la UI usa los tokens de CSS. */
export interface CanvasTheme {
  readonly name: 'light' | 'dark';
  readonly paper: string;
  readonly gridMinor: string;
  readonly gridMajor: string;
  readonly margin: string;
  readonly selection: string;
  readonly selectionFill: string;
  /** Traduce un color guardado al color en pantalla (la tinta negra se aclara en oscuro). */
  mapColor(color: string): string;
}

export const LIGHT_THEME: CanvasTheme = {
  name: 'light',
  paper: '#fdfdfc',
  gridMinor: 'rgba(15, 23, 42, 0.07)',
  gridMajor: 'rgba(15, 23, 42, 0.13)',
  margin: 'rgba(220, 38, 38, 0.28)',
  selection: '#6366f1',
  selectionFill: 'rgba(99, 102, 241, 0.08)',
  mapColor: (color) => color,
};

export const DARK_THEME: CanvasTheme = {
  name: 'dark',
  paper: '#18181b',
  gridMinor: 'rgba(244, 244, 245, 0.06)',
  gridMajor: 'rgba(244, 244, 245, 0.12)',
  margin: 'rgba(248, 113, 113, 0.3)',
  selection: '#818cf8',
  selectionFill: 'rgba(129, 140, 248, 0.1)',
  mapColor: (color) => (color === INK ? '#ececec' : color),
};
