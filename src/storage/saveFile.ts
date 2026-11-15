import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { isTauri } from './platform';

export interface FileToSave {
  name: string;
  extension: 'png' | 'svg';
  blob: Blob;
}

/**
 * Pide dónde guardar y escribe el archivo. Devuelve false si el usuario canceló.
 * En el navegador, lo descarga.
 */
export async function saveFile(file: FileToSave): Promise<boolean> {
  if (!isTauri()) {
    downloadInBrowser(file);
    return true;
  }
  const path = await save({
    defaultPath: `${file.name}.${file.extension}`,
    filters: [{ name: file.extension.toUpperCase(), extensions: [file.extension] }],
  });
  if (!path) return false;
  await invoke('save_export', { path, base64: await blobToBase64(file.blob) });
  return true;
}

function downloadInBrowser(file: FileToSave): void {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${file.name}.${file.extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
