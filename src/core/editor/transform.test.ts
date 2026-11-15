import { describe, expect, it } from 'vitest';
import { getElementBounds, hitTestElement } from '../model/geometry';
import { makeRect, makeStroke } from '../testing/fixtures';
import { rotateElements, scaleElements } from './transform';

describe('escalar', () => {
  it('duplica un rectángulo desde su esquina superior izquierda', () => {
    const [rect] = scaleElements([makeRect({ x: 10, y: 10, w: 100, h: 50 })], { x: 10, y: 10 }, 2, 2);
    expect([rect.x, rect.y, rect.w, rect.h]).toEqual([10, 10, 200, 100]);
  });

  it('escala los puntos del trazo y espeja con factor negativo', () => {
    const stroke = makeStroke({ points: [0, 0, 0.5, 20, 0, 0.5], w: 20, h: 0 });
    const [flipped] = scaleElements([stroke], { x: 10, y: 0 }, -1, 1);
    expect(flipped.type === 'stroke' && flipped.points).toEqual([20, 0, 0.5, 0, 0, 0.5]);
  });
});

describe('rotar', () => {
  it('un cuarto de vuelta alrededor de su centro intercambia ancho y alto de la caja', () => {
    const rect = makeRect({ x: 0, y: 0, w: 100, h: 20, size: 0 });
    const [rotated] = rotateElements([rect], { x: 50, y: 10 }, Math.PI / 2);
    const b = getElementBounds(rotated);
    expect(b.maxX - b.minX).toBeCloseTo(20);
    expect(b.maxY - b.minY).toBeCloseTo(100);
  });

  it('el clic sigue acertando sobre el borde rotado', () => {
    const rect = makeRect({ x: 0, y: 0, w: 100, h: 20 });
    const [rotated] = rotateElements([rect], { x: 50, y: 10 }, Math.PI / 2);
    // El borde superior original queda a la derecha: x = 60, y entre -40 y 60.
    expect(hitTestElement(rotated, 60, 0, { tolerance: 1, includeInterior: false })).toBe(true);
    expect(hitTestElement(rotated, 0, 10, { tolerance: 1, includeInterior: false })).toBe(false);
  });
});
