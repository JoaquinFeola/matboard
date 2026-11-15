import type { Editor } from '@/core/editor/Editor';
import { exportPng, exportSvg, type ExportOptions } from '@/core/export/exporter';
import type { BoardMeta } from '@/core/model/board';
import type { Element } from '@/core/model/element';
import type { CanvasTheme } from '@/core/render/theme';
import { assetStore, blobToDataUrl } from '@/storage/AssetStore';
import { saveFile, type FileToSave } from '@/storage/saveFile';

export type ExportFormat = FileToSave['extension'];

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
  await editor.images.ensure(imageIds(elements));
  const options: ExportOptions = {
    background: meta.background,
    withBackground: request.withBackground,
    theme,
    images: editor.images,
    imageDataUrl: async (id) => blobToDataUrl(await assetStore.load(id)).catch(() => null),
  };
  const blob = await render(elements, options, request.format);
  return blob ? saveFile({ name: safeFileName(meta.name), extension: request.format, blob }) : false;
}

async function render(elements: Element[], options: ExportOptions, format: ExportFormat): Promise<Blob | null> {
  switch (format) {
    case 'png':
      return exportPng(elements, options);
    case 'svg': {
      const svg = await exportSvg(elements, options);
      return svg ? new Blob([svg], { type: 'image/svg+xml' }) : null;
    }
    case 'pdf': {
      // Se carga solo al exportar: no ocupa memoria mientras se dibuja.
      const { exportPdf } = await import('@/core/export/pdf');
      const bytes = await exportPdf(elements, options);
      return bytes ? new Blob([bytes as BlobPart], { type: 'application/pdf' }) : null;
    }
  }
}

const imageIds = (elements: readonly Element[]) =>
  elements.flatMap((element) => (element.type === 'image' ? [element.assetId] : []));

const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|·]+/g, '').replace(/\s+/g, ' ').trim() || 'pizarra';
