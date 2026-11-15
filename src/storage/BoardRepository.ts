import type { BoardDocument, BoardMeta } from '@/core/model/board';

/** Dónde viven las pizarras. La UI no sabe si es disco (Tauri) o el navegador. */
export interface BoardRepository {
  /** Metadatos de todas las pizarras, más recientes primero. */
  list(): Promise<BoardMeta[]>;
  load(id: string): Promise<BoardDocument>;
  save(doc: BoardDocument): Promise<void>;
  remove(id: string): Promise<void>;
}

export const sortByRecent = (metas: BoardMeta[]): BoardMeta[] =>
  metas.sort((a, b) => b.updatedAt - a.updatedAt);
