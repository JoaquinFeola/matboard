import { describe, expect, it } from 'vitest';
import { makeRect, makeStroke } from '../testing/fixtures';
import { cloneElements, parseClipboardText, toClipboardText } from './clipboard';

describe('portapapeles', () => {
  it('ida y vuelta por texto', () => {
    const elements = [makeStroke(), makeRect()];
    expect(parseClipboardText(toClipboardText(elements))).toEqual(elements);
  });

  it('ignora texto que no es de Matboard', () => {
    expect(parseClipboardText('hola')).toBeNull();
    expect(parseClipboardText('matboard/elements:{roto')).toBeNull();
  });

  it('las copias tienen ids nuevos, se desplazan y conservan el orden', () => {
    const a = makeRect({ z: 5, x: 10 });
    const b = makeRect({ z: 2, x: 0 });
    const copies = cloneElements([a, b], 20, 0, 100);
    expect(copies.map((c) => c.id)).not.toContain(a.id);
    expect(copies.map((c) => [c.x, c.z])).toEqual([
      [20, 100],
      [30, 101],
    ]);
  });
});
