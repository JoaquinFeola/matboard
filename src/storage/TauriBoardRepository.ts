import { invoke } from '@tauri-apps/api/core';
import type { BoardDocument, BoardMeta } from '@/core/model/board';
import { parseBoard, parseMeta, serializeBoard } from '@/core/model/serialize';
import { sortByRecent, type BoardRepository } from './BoardRepository';

/** Archivos JSON en la carpeta de datos de la app (ver `src-tauri/src/boards.rs`). */
export class TauriBoardRepository implements BoardRepository {
  async list(): Promise<BoardMeta[]> {
    const raw = await invoke<string[]>('list_boards');
    const metas: BoardMeta[] = [];
    for (const text of raw) {
      try {
        metas.push(parseMeta(JSON.parse(text)));
      } catch {
        // Un metadato dañado no debe impedir listar el resto.
      }
    }
    return sortByRecent(metas);
  }

  async load(id: string): Promise<BoardDocument> {
    return parseBoard(await invoke<string>('load_board', { id }));
  }

  async save(doc: BoardDocument): Promise<void> {
    await invoke('save_board', {
      id: doc.meta.id,
      meta: JSON.stringify(doc.meta),
      data: serializeBoard({ ...doc, meta: { ...doc.meta, thumbnail: undefined } }),
    });
  }

  async remove(id: string): Promise<void> {
    await invoke('delete_board', { id });
  }
}
