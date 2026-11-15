/** Colores de tinta de la barra. `INK` se invierte en tema oscuro para que siempre contraste. */
export const INK = '#1e1e1e';

export const INK_COLORS: readonly { value: string; label: string }[] = [
  { value: INK, label: 'Negro' },
  { value: '#2563eb', label: 'Azul' },
  { value: '#dc2626', label: 'Rojo' },
  { value: '#16a34a', label: 'Verde' },
  { value: '#ea580c', label: 'Naranja' },
  { value: '#9333ea', label: 'Violeta' },
];

/** El resaltador no usa tinta negra: se reemplaza por amarillo. */
export const HIGHLIGHTER_DEFAULT = '#facc15';

export type SizeKey = 's' | 'm' | 'l' | 'xl';
export const SIZE_KEYS: readonly SizeKey[] = ['s', 'm', 'l', 'xl'];

/** Grosor real según la herramienta y el tamaño elegido. */
export const SIZE_TABLE = {
  pen: { s: 2, m: 3.5, l: 6, xl: 12 },
  pencil: { s: 1.25, m: 2, l: 3.5, xl: 6 },
  highlighter: { s: 10, m: 16, l: 24, xl: 36 },
  shape: { s: 1.5, m: 2.5, l: 4, xl: 7 },
  text: { s: 16, m: 24, l: 36, xl: 56 },
} as const satisfies Record<string, Record<SizeKey, number>>;

export type SizeFamily = keyof typeof SIZE_TABLE;
