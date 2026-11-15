import type { Editor } from '@/core/editor/Editor';
import { exportThumbnail } from '@/core/export/exporter';
import { BOARD_FILE_VERSION, type BoardMeta } from '@/core/model/board';
import { LIGHT_THEME } from '@/core/render/theme';
import type { BoardRepository } from '@/storage/BoardRepository';

export interface Autosave {
  /** Programa un guardado (agrupa cambios seguidos). */
  schedule(): void;
  /** Guarda ya lo pendiente. */
  flush(): Promise<void>;
  dispose(): void;
}

export const AUTOSAVE_DELAY_MS = 600;

/**
 * Guarda la pizarra poco después del último cambio. La miniatura se genera con
 * el tema claro y la UI la adapta al tema oscuro.
 */
export function createAutosave(
  editor: Editor,
  getMeta: () => BoardMeta,
  repository: BoardRepository,
  onError: (error: unknown) => void,
  delay = AUTOSAVE_DELAY_MS,
): Autosave {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;
  let saving: Promise<void> = Promise.resolve();

  const save = async () => {
    pending = false;
    const elements = editor.elements();
    const meta = getMeta();
    const thumbnail = exportThumbnail(elements, {
      background: meta.background,
      withBackground: false,
      theme: LIGHT_THEME,
      padding: 16,
      images: editor.images,
    });
    try {
      await repository.save({
        version: BOARD_FILE_VERSION,
        meta: { ...meta, updatedAt: Date.now(), thumbnail },
        elements,
      });
    } catch (error) {
      onError(error);
    }
  };

  const run = () => {
    timer = undefined;
    // Encadena para que dos guardados nunca se pisen.
    saving = saving.then(save);
  };

  return {
    schedule() {
      pending = true;
      clearTimeout(timer);
      timer = setTimeout(run, delay);
    },
    async flush() {
      clearTimeout(timer);
      if (pending) run();
      await saving;
    },
    dispose() {
      clearTimeout(timer);
    },
  };
}
