import { describe, expect, it } from 'vitest';
import { makeRect, makeStroke } from '../testing/fixtures';
import { elementTouchesRect, getElementBounds, hitTestElement } from './geometry';
import { parseBoard, serializeBoard } from './serialize';
import { BOARD_FILE_VERSION, createBoardMeta, type BoardDocument } from './board';

const precise = { tolerance: 1, includeInterior: false };

describe('geometría', () => {
  it('los límites de un trazo incluyen su grosor', () => {
    expect(getElementBounds(makeStroke({ x: 10, y: 10, size: 4 }))).toEqual({
      minX: 6,
      minY: 6,
      maxX: 34,
      maxY: 14,
    });
  });

  it('acierta cerca del trazo y falla lejos', () => {
    const stroke = makeStroke({ x: 100, y: 100 });
    expect(hitTestElement(stroke, 110, 101, precise)).toBe(true);
    expect(hitTestElement(stroke, 110, 120, precise)).toBe(false);
  });

  it('el interior del rectángulo cuenta solo si se pide', () => {
    const rect = makeRect();
    expect(hitTestElement(rect, 50, 25, precise)).toBe(false);
    expect(hitTestElement(rect, 50, 25, { ...precise, includeInterior: true })).toBe(true);
    expect(hitTestElement(rect, 0, 25, precise)).toBe(true);
  });

  it('el rectángulo de selección necesita tocar un punto del trazo', () => {
    const stroke = makeStroke({ x: 0, y: 0, points: [0, 0, 0.5, 100, 100, 0.5], w: 100, h: 100 });
    // Cruza la caja del trazo pero no contiene ninguno de sus puntos.
    expect(elementTouchesRect(stroke, { minX: 80, minY: 0, maxX: 95, maxY: 10 })).toBe(false);
    expect(elementTouchesRect(stroke, { minX: 90, minY: 90, maxX: 110, maxY: 110 })).toBe(true);
  });
});

describe('formato de archivo', () => {
  it('ida y vuelta conserva los elementos', () => {
    const doc: BoardDocument = {
      version: BOARD_FILE_VERSION,
      meta: createBoardMeta('abc', 'lined', 'Física'),
      elements: [makeStroke(), makeRect()],
    };
    expect(parseBoard(serializeBoard(doc))).toEqual(doc);
  });

  it('descarta elementos desconocidos', () => {
    const text = JSON.stringify({
      version: BOARD_FILE_VERSION,
      meta: createBoardMeta('abc', 'grid'),
      elements: [{ type: 'imagen' }, makeRect()],
    });
    expect(parseBoard(text).elements).toHaveLength(1);
  });

  it('rechaza un archivo dañado', () => {
    expect(() => parseBoard('{nope')).toThrow();
  });
});
