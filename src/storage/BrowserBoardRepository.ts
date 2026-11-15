import type { BoardDocument, BoardMeta } from '@/core/model/board';
import { parseBoard, parseMeta, serializeBoard } from '@/core/model/serialize';
import { sortByRecent, type BoardRepository } from './BoardRepository';

const META_PREFIX = 'matboard:meta:';
const DATA_PREFIX = 'matboard:board:';

/**
 * Respaldo para correr la UI en un navegador (desarrollo y pruebas). La app de
 * escritorio usa `TauriBoardRepository`.
 */
export class BrowserBoardRepository implements BoardRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  async list(): Promise<BoardMeta[]> {
    const metas: BoardMeta[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (!key?.startsWith(META_PREFIX)) continue;
      try {
        metas.push(parseMeta(JSON.parse(this.storage.getItem(key) ?? '')));
      } catch {
        // Se ignora un metadato dañado.
      }
    }
    return sortByRecent(metas);
  }

  async load(id: string): Promise<BoardDocument> {
    const text = this.storage.getItem(DATA_PREFIX + id);
    if (text === null) throw new Error('La pizarra no existe');
    return parseBoard(text);
  }

  async save(doc: BoardDocument): Promise<void> {
    this.storage.setItem(
      DATA_PREFIX + doc.meta.id,
      serializeBoard({ ...doc, meta: { ...doc.meta, thumbnail: undefined } }),
    );
    this.storage.setItem(META_PREFIX + doc.meta.id, JSON.stringify(doc.meta));
  }

  async remove(id: string): Promise<void> {
    this.storage.removeItem(DATA_PREFIX + id);
    this.storage.removeItem(META_PREFIX + id);
  }
}
