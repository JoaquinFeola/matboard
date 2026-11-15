import type { Element } from './element';

export type BackgroundKind = 'grid' | 'lined' | 'dots' | 'blank';

export const BACKGROUND_KINDS: readonly BackgroundKind[] = ['grid', 'lined', 'dots', 'blank'];

export interface BoardMeta {
  id: string;
  name: string;
  background: BackgroundKind;
  createdAt: number;
  updatedAt: number;
  /** Miniatura como data URL (WebP/PNG), opcional. */
  thumbnail?: string;
}

export const BOARD_FILE_VERSION = 1;

export interface BoardDocument {
  version: typeof BOARD_FILE_VERSION;
  meta: BoardMeta;
  elements: Element[];
}

export function createBoardMeta(
  id: string,
  background: BackgroundKind,
  name = 'Sin título',
  now = Date.now(),
): BoardMeta {
  return { id, name, background, createdAt: now, updatedAt: now };
}
