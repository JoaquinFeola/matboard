import type { Editor } from '@/core/editor/Editor';
import { exportPng, exportSvg } from '@/core/export/exporter';
import type { BoardMeta } from '@/core/model/board';
import type { CanvasTheme } from '@/core/render/theme';
import { saveFile } from '@/storage/saveFile';

export type ExportFormat = 'png' | 'svg';

export interface ExportRequest {
  format: ExportFormat;
  withBackground: boolean;
  onlySelection: boolean;
}

/** Exporta la pizarra (o la selección). Devuelve false si no había nada o se canceló. */
export async function exportBoard(
  editor: Editor,
  meta: BoardMeta,
  theme: CanvasTheme,
  request: ExportRequest,
): Promise<boolean> {
  const elements =
    request.onlySelection && editor.selection.size > 0 ? editor.selectedElements() : editor.elements();
  const options = { background: meta.background, withBackground: request.withBackground, theme };
  const name = safeFileName(meta.name);

  if (request.format === 'png') {
    const blob = await exportPng(elements, options);
    return blob ? saveFile({ name, extension: 'png', blob }) : false;
  }
  const svg = exportSvg(elements, options);
  return svg ? saveFile({ name, extension: 'svg', blob: new Blob([svg], { type: 'image/svg+xml' }) }) : false;
}

const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|·]+/g, '').replace(/\s+/g, ' ').trim() || 'pizarra';
