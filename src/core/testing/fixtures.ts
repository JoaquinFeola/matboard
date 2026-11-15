import type { ShapeElement, StrokeElement } from '../model/element';

let counter = 0;

export function makeStroke(overrides: Partial<StrokeElement> = {}): StrokeElement {
  counter++;
  return {
    id: `s${counter}`,
    type: 'stroke',
    variant: 'pen',
    x: 0,
    y: 0,
    z: counter,
    color: '#000',
    size: 4,
    points: [0, 0, 0.5, 10, 0, 0.5, 20, 0, 0.5],
    pressure: false,
    w: 20,
    h: 0,
    ...overrides,
  };
}

export function makeRect(overrides: Partial<ShapeElement> = {}): ShapeElement {
  counter++;
  return {
    id: `r${counter}`,
    type: 'shape',
    shape: 'rect',
    x: 0,
    y: 0,
    z: counter,
    color: '#000',
    size: 2,
    w: 100,
    h: 50,
    ...overrides,
  };
}
