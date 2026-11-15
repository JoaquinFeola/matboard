import { boundsHeight, boundsWidth } from '../math/bounds';
import type { Element } from '../model/element';
import { PAPER_SPACING } from '../render/background';
import { paintOrder } from '../render/painter';
import { traceShape, type ShapeSink } from '../render/shapePath';
import { computeOutline, strokeOpacity, traceOutline, type PathSink } from '../render/strokeOutline';
import { TEXT_LINE_HEIGHT } from '../render/text';
import { exportBounds, type ExportOptions } from './exporter';

/**
 * PDF vectorial de una página: trazos, formas y texto quedan nítidos a cualquier
 * zoom. Sin dependencias: solo lo que Matboard necesita del formato.
 */

/** 1 unidad de mundo = 1 px CSS = 0,75 pt. */
const PT_PER_UNIT = 0.75;
/** Línea base aproximada respecto del borde superior en Helvetica. */
const BASELINE_RATIO = 0.8;
const JPEG_QUALITY = 0.92;

export async function exportPdf(elements: readonly Element[], options: ExportOptions): Promise<Uint8Array | null> {
  const bounds = exportBounds(elements, options.padding);
  if (!bounds) return null;
  const width = boundsWidth(bounds);
  const height = boundsHeight(bounds);
  const page = new PageContent();
  const k = PT_PER_UNIT;

  // Coordenadas de mundo con el eje y hacia abajo, como en el lienzo.
  page.op(`${n(k)} 0 0 ${n(-k)} 0 ${n(height * k)} cm`);
  page.op(`1 0 0 1 ${n(-bounds.minX)} ${n(-bounds.minY)} cm`);

  if (options.withBackground) paintPaper(page, options, bounds.minX, bounds.minY, width, height);
  for (const element of paintOrder(elements)) await paintElement(page, element, options);

  return assemble(page, width * k, height * k);
}

// ── Contenido de la página ────────────────────────────────────────────

interface PdfImage {
  name: string;
  width: number;
  height: number;
  jpeg: Uint8Array;
}

class PageContent {
  readonly ops: string[] = [];
  readonly states = new Map<string, string>();
  readonly images = new Map<string, PdfImage>();
  usesFont = false;

  op(line: string): void {
    this.ops.push(line);
  }

  /** Nombre de un estado gráfico con opacidad (y mezcla), creado bajo demanda. */
  state(alpha: number, multiply = false): string {
    const key = `${alpha}|${multiply}`;
    let name = this.states.get(key);
    if (!name) {
      name = `GS${this.states.size}`;
      this.states.set(key, name);
    }
    return name;
  }
}

/** Traza en operadores PDF; convierte cuadráticas a cúbicas. */
class PdfPath implements PathSink, ShapeSink {
  private parts: string[] = [];
  private cx = 0;
  private cy = 0;
  private sx = 0;
  private sy = 0;

  moveTo(x: number, y: number): void {
    this.parts.push(`${n(x)} ${n(y)} m`);
    this.cx = this.sx = x;
    this.cy = this.sy = y;
  }
  lineTo(x: number, y: number): void {
    this.parts.push(`${n(x)} ${n(y)} l`);
    this.cx = x;
    this.cy = y;
  }
  quadraticCurveTo(qx: number, qy: number, x: number, y: number): void {
    const c1x = this.cx + ((qx - this.cx) * 2) / 3;
    const c1y = this.cy + ((qy - this.cy) * 2) / 3;
    const c2x = x + ((qx - x) * 2) / 3;
    const c2y = y + ((qy - y) * 2) / 3;
    this.parts.push(`${n(c1x)} ${n(c1y)} ${n(c2x)} ${n(c2y)} ${n(x)} ${n(y)} c`);
    this.cx = x;
    this.cy = y;
  }
  closePath(): void {
    this.parts.push('h');
    this.cx = this.sx;
    this.cy = this.sy;
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.parts.push(`${n(x)} ${n(y)} ${n(w)} ${n(h)} re`);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number): void {
    // Cuatro arcos cúbicos (constante clásica 0,5523).
    const kx = rx * 0.5523;
    const ky = ry * 0.5523;
    this.moveTo(cx + rx, cy);
    this.parts.push(`${n(cx + rx)} ${n(cy + ky)} ${n(cx + kx)} ${n(cy + ry)} ${n(cx)} ${n(cy + ry)} c`);
    this.parts.push(`${n(cx - kx)} ${n(cy + ry)} ${n(cx - rx)} ${n(cy + ky)} ${n(cx - rx)} ${n(cy)} c`);
    this.parts.push(`${n(cx - rx)} ${n(cy - ky)} ${n(cx - kx)} ${n(cy - ry)} ${n(cx)} ${n(cy - ry)} c`);
    this.parts.push(`${n(cx + kx)} ${n(cy - ry)} ${n(cx + rx)} ${n(cy - ky)} ${n(cx + rx)} ${n(cy)} c`);
    this.closePath();
  }
  toString(): string {
    return this.parts.join('\n');
  }
}

async function paintElement(page: PageContent, element: Element, options: ExportOptions): Promise<void> {
  const { theme } = options;
  const color = parseColor(theme.mapColor(element.color));
  page.op('q');
  page.op(`1 0 0 1 ${n(element.x)} ${n(element.y)} cm`);
  if (element.angle) {
    const cx = element.w / 2;
    const cy = element.h / 2;
    const cos = Math.cos(element.angle);
    const sin = Math.sin(element.angle);
    page.op(`1 0 0 1 ${n(cx)} ${n(cy)} cm`);
    page.op(`${n(cos, 5)} ${n(sin, 5)} ${n(-sin, 5)} ${n(cos, 5)} 0 0 cm`);
    page.op(`1 0 0 1 ${n(-cx)} ${n(-cy)} cm`);
  }

  switch (element.type) {
    case 'stroke': {
      const path = new PdfPath();
      traceOutline(path, computeOutline(element.points, element.variant, element.size, element.pressure, true));
      const alpha = strokeOpacity(element.variant) * color.a;
      const multiply = element.variant === 'highlighter' && theme.name === 'light';
      if (alpha < 1 || multiply) page.op(`/${page.state(alpha, multiply)} gs`);
      page.op(`${rgb(color)} rg`);
      page.op(`${path}\nf`);
      break;
    }
    case 'shape': {
      const path = new PdfPath();
      traceShape(path, element.shape, element.w, element.h, element.size);
      if (color.a < 1) page.op(`/${page.state(color.a)} gs`);
      page.op(`${rgb(color)} RG ${n(element.size)} w 1 J 1 j`);
      page.op(`${path}\nS`);
      break;
    }
    case 'text': {
      page.usesFont = true;
      const lineHeight = element.size * TEXT_LINE_HEIGHT;
      const offset = (lineHeight - element.size) / 2;
      page.op(`${rgb(color)} rg BT /F1 ${n(element.size)} Tf`);
      element.text.split('\n').forEach((line, i) => {
        const baseline = i * lineHeight + offset + element.size * BASELINE_RATIO;
        // El eje y está invertido: el texto se vuelve a invertir para no salir espejado.
        page.op(`1 0 0 -1 0 ${n(baseline)} Tm <${winAnsiHex(line)}> Tj`);
      });
      page.op('ET');
      break;
    }
    case 'image': {
      const image = await toPdfImage(element.assetId, page, options);
      if (image) page.op(`${n(element.w)} 0 0 ${n(-element.h)} 0 ${n(element.h)} cm /${image.name} Do`);
      break;
    }
  }
  page.op('Q');
}

/** Recomprime la imagen como JPEG sobre blanco (PDF la decodifica nativamente). */
async function toPdfImage(assetId: string, page: PageContent, options: ExportOptions): Promise<PdfImage | null> {
  const existing = page.images.get(assetId);
  if (existing) return existing;
  const source = options.images?.get(assetId);
  if (!source || typeof OffscreenCanvas === 'undefined') return null;
  const { width, height } = source as ImageBitmap;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  const image = { name: `Im${page.images.size}`, width, height, jpeg: new Uint8Array(await blob.arrayBuffer()) };
  page.images.set(assetId, image);
  return image;
}

function paintPaper(page: PageContent, options: ExportOptions, x: number, y: number, w: number, h: number): void {
  const { theme, background } = options;
  page.op(`${rgb(parseColor(theme.paper))} rg ${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`);
  if (background === 'blank') return;

  const line = parseColor(background === 'lined' ? theme.gridMajor : theme.gridMinor);
  const step = PAPER_SPACING;
  const firstX = Math.ceil(x / step) * step;
  const firstY = Math.ceil(y / step) * step;
  page.op('q');
  page.op(`/${page.state(line.a)} gs ${rgb(line)} RG ${rgb(line)} rg 0.75 w`);
  if (background === 'dots') {
    const path = new PdfPath();
    for (let py = firstY; py <= y + h; py += step) {
      for (let px = firstX; px <= x + w; px += step) path.ellipse(px, py, 1.2, 1.2);
    }
    page.op(`${path}\nf`);
  } else {
    const path = new PdfPath();
    for (let py = firstY; py <= y + h; py += step) {
      path.moveTo(x, py);
      path.lineTo(x + w, py);
    }
    if (background === 'grid') {
      for (let px = firstX; px <= x + w; px += step) {
        path.moveTo(px, y);
        path.lineTo(px, y + h);
      }
    }
    page.op(`${path}\nS`);
  }
  page.op('Q');
}

// ── Archivo ───────────────────────────────────────────────────────────

const encoder = new TextEncoder();

async function assemble(page: PageContent, widthPt: number, heightPt: number): Promise<Uint8Array> {
  const content = await deflate(encoder.encode(page.ops.join('\n')));
  const objects: Uint8Array[][] = [];
  const add = (...parts: (string | Uint8Array)[]) => {
    objects.push(parts.map((p) => (typeof p === 'string' ? encoder.encode(p) : p)));
    return objects.length;
  };

  const catalog = add('<< /Type /Catalog /Pages 2 0 R >>');
  add(''); // 2: Pages, se completa al final
  const contentRef = add(`<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n`, content, '\nendstream');
  const fontRef = page.usesFont
    ? add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    : 0;
  const imageRefs = [...page.images.values()].map((img) => ({
    name: img.name,
    ref: add(
      `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpeg.length} >>\nstream\n`,
      img.jpeg,
      '\nendstream',
    ),
  }));

  const states = [...page.states.entries()]
    .map(([key, name]) => {
      const [alpha, multiply] = key.split('|');
      return `/${name} << /ca ${alpha} /CA ${alpha}${multiply === 'true' ? ' /BM /Multiply' : ''} >>`;
    })
    .join(' ');
  const resources = [
    fontRef ? `/Font << /F1 ${fontRef} 0 R >>` : '',
    states ? `/ExtGState << ${states} >>` : '',
    imageRefs.length ? `/XObject << ${imageRefs.map((i) => `/${i.name} ${i.ref} 0 R`).join(' ')} >>` : '',
  ].join(' ');
  const pageRef = add(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(widthPt)} ${n(heightPt)}] /Contents ${contentRef} 0 R /Resources << ${resources} >> >>`,
  );
  objects[1] = [encoder.encode(`<< /Type /Pages /Kids [${pageRef} 0 R] /Count 1 >>`)];

  const chunks: Uint8Array[] = [encoder.encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
  let offset = chunks[0].length;
  const offsets: number[] = [];
  objects.forEach((parts, i) => {
    offsets.push(offset);
    const piece = [encoder.encode(`${i + 1} 0 obj\n`), ...parts, encoder.encode('\nendobj\n')];
    piece.forEach((p) => (offset += p.length));
    chunks.push(...piece);
  });
  const xref =
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('') +
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  chunks.push(encoder.encode(xref));
  return concat(chunks);
}

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  // 'deflate' produce formato zlib, que es lo que espera /FlateDecode.
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

// ── Utilidades ────────────────────────────────────────────────────────

const n = (value: number, decimals = 2): string => {
  const fixed = value.toFixed(decimals);
  return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') || '0' : fixed;
};

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Acepta #rgb, #rrggbb y rgb()/rgba() (incluida la sintaxis con espacios y "/"). */
export function parseColor(value: string): Rgba {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  const fn = value.match(/rgba?\(([^)]+)\)/i);
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts[3] ?? 1 };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

const rgb = (c: Rgba) => `${n(c.r / 255, 3)} ${n(c.g / 255, 3)} ${n(c.b / 255, 3)}`;

/** Codifica en WinAnsi (cubre español); lo que no entra se reemplaza por "?". */
export function winAnsiHex(text: string): string {
  const special: Record<string, number> = { '€': 0x80, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '–': 0x96, '—': 0x97, '•': 0x95 };
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63;
    const byte = special[ch] ?? (code >= 32 && code <= 255 && (code < 127 || code >= 160) ? code : 63);
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}
