import type { BoardRepository } from './BoardRepository';
import { BrowserBoardRepository } from './BrowserBoardRepository';
import { TauriBoardRepository } from './TauriBoardRepository';

/** true dentro de la app de escritorio. */
export const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const boardRepository: BoardRepository = isTauri()
  ? new TauriBoardRepository()
  : new BrowserBoardRepository();
