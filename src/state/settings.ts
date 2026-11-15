import { createEffect, createRoot, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { TouchMode, WheelMode } from '@/core/input/InputController';
import { BACKGROUND_KINDS, type BackgroundKind } from '@/core/model/board';
import { DARK_THEME, LIGHT_THEME, type CanvasTheme } from '@/core/render/theme';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Settings {
  theme: ThemePreference;
  wheelMode: WheelMode;
  touchMode: TouchMode;
  defaultBackground: BackgroundKind;
}

const STORAGE_KEY = 'matboard:settings';

const DEFAULTS: Settings = {
  theme: 'system',
  wheelMode: 'pan',
  touchMode: 'navigate',
  defaultBackground: 'grid',
};

function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Settings>;
    const merged = { ...DEFAULTS, ...raw };
    if (!BACKGROUND_KINDS.includes(merged.defaultBackground)) merged.defaultBackground = 'grid';
    return merged;
  } catch {
    return { ...DEFAULTS };
  }
}

/** Configuración de la app, persistida por equipo. */
export const { settings, updateSettings, resolvedTheme, canvasTheme } = createRoot(() => {
  const [settings, setSettings] = createStore<Settings>(loadSettings());
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const [systemDark, setSystemDark] = createSignal(media.matches);
  media.addEventListener('change', (e) => setSystemDark(e.matches));

  const resolvedTheme = (): 'light' | 'dark' =>
    settings.theme === 'system' ? (systemDark() ? 'dark' : 'light') : settings.theme;
  const canvasTheme = (): CanvasTheme => (resolvedTheme() === 'dark' ? DARK_THEME : LIGHT_THEME);

  createEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme();
  });

  const updateSettings = (patch: Partial<Settings>): void => {
    setSettings(patch);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Sin almacenamiento: la configuración vale solo para esta sesión.
    }
  };

  return { settings, updateSettings, resolvedTheme, canvasTheme };
});
