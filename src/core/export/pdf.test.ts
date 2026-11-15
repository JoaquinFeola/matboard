import { describe, expect, it } from 'vitest';
import { LIGHT_THEME } from '../render/theme';
import { makeRect, makeStroke } from '../testing/fixtures';
import { exportPdf, parseColor, winAnsiHex } from './pdf';

const latin1 = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join('');

describe('PDF', () => {
  it('arma un archivo válido con tabla xref coherente', async () => {
    const bytes = await exportPdf(
      [makeStroke(), makeRect({ angle: 0.5 }), { ...makeRect(), id: 't', type: 'text', text: 'Física ¿sí?', size: 24, w: 100, h: 31 }],
      { background: 'grid', withBackground: true, theme: LIGHT_THEME },
    );
    expect(bytes).not.toBeNull();
    const text = latin1(bytes!);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    // Cada entrada de la xref apunta exactamente al comienzo de su objeto.
    const xref = text.slice(text.lastIndexOf('xref'));
    const offsets = [...xref.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    offsets.forEach((offset, i) => expect(text.slice(offset, offset + 10)).toMatch(new RegExp(`^${i + 1} 0 obj`)));
    const startxref = Number(text.match(/startxref\n(\d+)/)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
    expect(text).toContain('/BaseFont /Helvetica');
  });

  it('una pizarra vacía no genera PDF', async () => {
    expect(await exportPdf([], { background: 'blank', withBackground: false, theme: LIGHT_THEME })).toBeNull();
  });

  it('interpreta colores hex y rgba', () => {
    expect(parseColor('#2563eb')).toEqual({ r: 37, g: 99, b: 235, a: 1 });
    expect(parseColor('rgba(15, 23, 42, 0.07)')).toEqual({ r: 15, g: 23, b: 42, a: 0.07 });
  });

  it('codifica acentos en WinAnsi', () => {
    expect(winAnsiHex('ñá')).toBe('f1e1');
    expect(winAnsiHex('π')).toBe('3f');
  });
});
