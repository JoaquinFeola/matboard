import { BACKGROUND_KINDS, BOARD_FILE_VERSION, type BoardDocument, type BoardMeta } from './board';
import type { Element } from './element';

export class BoardFormatError extends Error {}

export function serializeBoard(doc: BoardDocument): string {
  return JSON.stringify(doc);
}

/** Lee un archivo de pizarra, descartando elementos que no se reconocen. */
export function parseBoard(text: string): BoardDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BoardFormatError('El archivo de la pizarra está dañado');
  }
  if (!isRecord(raw) || raw.version !== BOARD_FILE_VERSION) {
    throw new BoardFormatError('Versión de pizarra no soportada');
  }
  const meta = parseMeta(raw.meta);
  const elements = Array.isArray(raw.elements) ? raw.elements.filter(isElement) : [];
  return { version: BOARD_FILE_VERSION, meta, elements };
}

export function parseMeta(raw: unknown): BoardMeta {
  if (!isRecord(raw) || typeof raw.id !== 'string') throw new BoardFormatError('Metadatos inválidos');
  const background = BACKGROUND_KINDS.includes(raw.background as never)
    ? (raw.background as BoardMeta['background'])
    : 'grid';
  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : 'Sin título',
    background,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    thumbnail: typeof raw.thumbnail === 'string' ? raw.thumbnail : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isElement(value: unknown): value is Element {
  if (!isRecord(value)) return false;
  const common =
    typeof value.id === 'string' &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.z === 'number' &&
    typeof value.color === 'string' &&
    typeof value.size === 'number';
  if (!common) return false;
  switch (value.type) {
    case 'stroke':
      return Array.isArray(value.points) && (value.variant === 'pen' || value.variant === 'pencil');
    case 'shape':
      return ['rect', 'ellipse', 'line', 'arrow'].includes(value.shape as string);
    case 'text':
      return typeof value.text === 'string';
    default:
      return false;
  }
}
