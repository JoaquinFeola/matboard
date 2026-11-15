import type { Editor } from '@/core/editor/Editor';
import { ASSET_MIME, type AssetStore } from '@/storage/AssetStore';

/** Lado máximo al importar: suficiente para apuntes y evita gastar RAM con fotos enormes. */
const MAX_SIDE = 2048;
const QUALITY = 0.9;

/**
 * Achica la imagen si hace falta, la guarda como WebP con un id derivado de su
 * contenido y la inserta en la pizarra.
 */
export async function importImages(files: readonly File[], editor: Editor, store: AssetStore): Promise<number> {
  let imported = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const source = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, width, height);
    source.close();

    const blob = await canvas.convertToBlob({ type: ASSET_MIME, quality: QUALITY });
    const id = await contentId(blob);
    await store.save(id, blob);
    editor.images.put(id, await createImageBitmap(canvas));
    editor.insertImage(id, width, height);
    imported++;
  }
  return imported;
}

/** Primeros 32 hex del SHA-256: la misma imagen siempre da el mismo id. */
async function contentId(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
