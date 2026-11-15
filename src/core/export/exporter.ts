import { boundsHeight, boundsWidth, expand, isEmpty, unionAll, type Bounds } from '../math/bounds';
import type { BackgroundKind } from '../model/board';
import type { Element } from '../model/element';
import { getElementBounds } from '../model/geometry';
import { paintBackground } from '../render/background';
import { paintElement, paintOrder } from '../render/painter';
import { computeOutline, strokeOpacity, traceOutline } from '../render/strokeOutline';
import { traceShape } from '../render/shapePath';
import { TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT } from '../render/text';
import type { ImageSource } from '../render/imageCache';
import type { CanvasTheme } from '../render/theme';
import { SvgPath } from './svgPath';

export interface ExportOptions {
  background: BackgroundKind;
  /** Incluir el color de papel y el patrón. */
  withBackground: boolean;
  theme: CanvasTheme;
  padding?: number;
  /** Imágenes decodificadas (PNG/miniatura). Llamar antes a `ImageCache.ensure`. */
  images?: ImageSource;
  /** Imagen como data URL, para incrustarla en SVG/PDF. */
  imageDataUrl?: (assetId: string) => Promise<string | null>;
}

const DEFAULT_PADDING = 32;
/** Lado máximo del PNG en píxeles, para no agotar memoria con pizarras enormes. */
const MAX_PNG_SIDE = 8192;

export function exportBounds(elements: readonly Element[], padding = DEFAULT_PADDING): Bounds | null {
  const bounds = unionAll(elements.map(getElementBounds));
  return isEmpty(bounds) ? null : expand(bounds, padding);
}

/** Dibuja los elementos en un canvas nuevo, a `scale` píxeles por unidad. */
export function renderToCanvas(
  elements: readonly Element[],
  options: ExportOptions,
  scale = 2,
): HTMLCanvasElement | null {
  const bounds = exportBounds(elements, options.padding);
  if (!bounds) return null;
  const width = boundsWidth(bounds);
  const height = boundsHeight(bounds);
  const effectiveScale = Math.min(scale, MAX_PNG_SIDE / Math.max(width, height));

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * effectiveScale);
  canvas.height = Math.ceil(height * effectiveScale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (options.withBackground) {
    paintBackground(
      ctx,
      options.background,
      { x: bounds.minX, y: bounds.minY, zoom: effectiveScale, width: canvas.width, height: canvas.height, dpr: 1 },
      options.theme,
    );
  }
  ctx.setTransform(effectiveScale, 0, 0, effectiveScale, -bounds.minX * effectiveScale, -bounds.minY * effectiveScale);
  for (const element of paintOrder(elements)) paintElement(ctx, element, options.theme, options.images);
  return canvas;
}

export function exportPng(elements: readonly Element[], options: ExportOptions): Promise<Blob | null> {
  const canvas = renderToCanvas(elements, options, 2);
  if (!canvas) return Promise.resolve(null);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Miniatura chica para la lista de pizarras. */
export function exportThumbnail(
  elements: readonly Element[],
  options: ExportOptions,
  maxSide = 360,
): string | undefined {
  const bounds = exportBounds(elements, options.padding);
  if (!bounds) return undefined;
  const scale = Math.min(1, maxSide / Math.max(boundsWidth(bounds), boundsHeight(bounds)));
  const canvas = renderToCanvas(elements, { ...options, withBackground: false }, scale);
  return canvas?.toDataURL('image/webp', 0.8);
}

const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);

/** SVG vectorial: los trazos se exportan como contornos rellenos, igual que en pantalla. */
export async function exportSvg(elements: readonly Element[], options: ExportOptions): Promise<string | null> {
  const bounds = exportBounds(elements, options.padding);
  if (!bounds) return null;
  const { theme } = options;
  const width = boundsWidth(bounds);
  const height = boundsHeight(bounds);
  const hrefs = await imageHrefs(elements, options);
  const body = paintOrder(elements)
    .map((element) => elementToSvg(element, theme, hrefs))
    .join('\n  ');
  const paper = options.withBackground
    ? `<rect x="${bounds.minX}" y="${bounds.minY}" width="${width}" height="${height}" fill="${theme.paper}"/>\n  `
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.minX} ${bounds.minY} ${width} ${height}" width="${Math.round(width)}" height="${Math.round(height)}">
  ${paper}${body}
</svg>`;
}

/** Data URL de cada imagen usada, para incrustarlas. */
async function imageHrefs(elements: readonly Element[], options: ExportOptions): Promise<Map<string, string>> {
  const hrefs = new Map<string, string>();
  const ids = new Set(elements.flatMap((e) => (e.type === 'image' ? [e.assetId] : [])));
  for (const id of ids) {
    const href = await options.imageDataUrl?.(id);
    if (href) hrefs.set(id, href);
  }
  return hrefs;
}

function elementToSvg(element: Element, theme: CanvasTheme, hrefs: Map<string, string>): string {
  const color = theme.mapColor(element.color);
  const rotation = element.angle
    ? ` rotate(${+((element.angle * 180) / Math.PI).toFixed(3)} ${element.w / 2} ${element.h / 2})`
    : '';
  const transform = `translate(${element.x} ${element.y})${rotation}`;
  switch (element.type) {
    case 'stroke': {
      const path = new SvgPath();
      traceOutline(path, computeOutline(element.points, element.variant, element.size, element.pressure, true));
      const alpha = strokeOpacity(element.variant);
      const opacity = alpha < 1 ? ` fill-opacity="${alpha}"` : '';
      const blend =
        element.variant === 'highlighter' && theme.name === 'light' ? ' style="mix-blend-mode:multiply"' : '';
      return `<path transform="${transform}" d="${path}" fill="${color}"${opacity}${blend}/>`;
    }
    case 'shape': {
      const path = new SvgPath();
      traceShape(path, element.shape, element.w, element.h, element.size);
      return `<path transform="${transform}" d="${path}" fill="none" stroke="${color}" stroke-width="${element.size}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    case 'text': {
      const lineHeight = element.size * TEXT_LINE_HEIGHT;
      const offset = (lineHeight - element.size) / 2;
      const lines = element.text
        .split('\n')
        .map((line, i) => `<tspan x="0" y="${i * lineHeight + offset}">${escapeXml(line) || ' '}</tspan>`)
        .join('');
      return `<text transform="${transform}" fill="${color}" font-size="${element.size}" font-family='${TEXT_FONT_FAMILY}' dominant-baseline="text-before-edge">${lines}</text>`;
    }
    case 'image': {
      const href = hrefs.get(element.assetId);
      return href
        ? `<image transform="${transform}" width="${element.w}" height="${element.h}" href="${href}" preserveAspectRatio="none"/>`
        : '';
    }
  }
}
