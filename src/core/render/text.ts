export const TEXT_FONT_FAMILY =
  '"Segoe UI Variable Text", "Segoe UI", ui-sans-serif, system-ui, sans-serif';
export const TEXT_LINE_HEIGHT = 1.3;

export const fontFor = (fontSize: number): string => `${fontSize}px ${TEXT_FONT_FAMILY}`;

let measureContext: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;

function getMeasureContext() {
  if (measureContext) return measureContext;
  measureContext =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(1, 1).getContext('2d')
      : document.createElement('canvas').getContext('2d');
  if (!measureContext) throw new Error('Canvas 2D no disponible');
  return measureContext;
}

/** Ancho y alto del bloque de texto multilínea. */
export function measureText(text: string, fontSize: number): { w: number; h: number } {
  const ctx = getMeasureContext();
  ctx.font = fontFor(fontSize);
  const lines = text.split('\n');
  const width = Math.max(...lines.map((line) => ctx.measureText(line).width), fontSize * 0.5);
  return { w: Math.ceil(width), h: Math.ceil(lines.length * fontSize * TEXT_LINE_HEIGHT) };
}
