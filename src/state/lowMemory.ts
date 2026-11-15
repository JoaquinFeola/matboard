import { invoke } from '@tauri-apps/api/core';
import { createResource } from 'solid-js';
import { isTauri } from '@/storage/platform';

/**
 * "Ahorro de memoria": la app de escritorio arranca sin aceleración gráfica.
 * Vive en un archivo de la carpeta de datos porque se lee antes de crear la ventana.
 */
export function useLowMemorySetting() {
  const available = isTauri();
  const [enabled, { mutate }] = createResource(() =>
    available ? invoke<boolean>('get_low_memory') : Promise.resolve(false),
  );
  const setEnabled = async (value: boolean) => {
    if (!available) return;
    await invoke('set_low_memory', { enabled: value });
    mutate(value);
  };
  return { available, enabled: () => enabled() ?? false, setEnabled };
}
