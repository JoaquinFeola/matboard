import { BOARD_FILE_VERSION, createBoardMeta, type BackgroundKind, type BoardMeta } from '@/core/model/board';
import { createId } from '@/core/util/id';
import { boardRepository } from '@/storage/platform';

const dateFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });
const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });

/** Nombre automático, para no frenar al crear: "Pizarra · 14 nov, 21:30". */
export function defaultBoardName(now = new Date()): string {
  return `Pizarra · ${dateFormat.format(now)}, ${timeFormat.format(now)}`;
}

export async function createBoard(background: BackgroundKind): Promise<BoardMeta> {
  const meta = createBoardMeta(createId(), background, defaultBoardName());
  await boardRepository.save({ version: BOARD_FILE_VERSION, meta, elements: [] });
  return meta;
}

export async function duplicateBoard(source: BoardMeta): Promise<BoardMeta> {
  const doc = await boardRepository.load(source.id);
  const now = Date.now();
  const meta: BoardMeta = {
    ...source,
    id: createId(),
    name: `${source.name} (copia)`,
    createdAt: now,
    updatedAt: now,
  };
  await boardRepository.save({ ...doc, meta });
  return meta;
}

const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

/** "hace 5 minutos", "ayer", o la fecha. */
export function formatUpdatedAt(timestamp: number, now = Date.now()): string {
  const minutes = Math.round((timestamp - now) / 60_000);
  if (Math.abs(minutes) < 1) return 'recién';
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return relative.format(days, 'day');
  return dateFormat.format(timestamp);
}
