import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './platform';

/** Imágenes de las pizarras, guardadas aparte por id (hash del contenido). */
export interface AssetStore {
  save(id: string, blob: Blob): Promise<void>;
  load(id: string): Promise<Blob>;
}

export const ASSET_MIME = 'image/webp';

class TauriAssetStore implements AssetStore {
  async save(id: string, blob: Blob): Promise<void> {
    await invoke('save_asset', { id, base64: await blobToBase64(blob) });
  }
  async load(id: string): Promise<Blob> {
    const bytes = await invoke<ArrayBuffer>('load_asset', { id });
    return new Blob([bytes], { type: ASSET_MIME });
  }
}

/** Respaldo para desarrollo en el navegador (localStorage, solo imágenes chicas). */
class BrowserAssetStore implements AssetStore {
  private readonly prefix = 'matboard:asset:';
  async save(id: string, blob: Blob): Promise<void> {
    localStorage.setItem(this.prefix + id, await blobToBase64(blob));
  }
  async load(id: string): Promise<Blob> {
    const base64 = localStorage.getItem(this.prefix + id);
    if (base64 === null) throw new Error('Imagen no encontrada');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return new Blob([bytes], { type: ASSET_MIME });
  }
}

export const assetStore: AssetStore = isTauri() ? new TauriAssetStore() : new BrowserAssetStore();

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
