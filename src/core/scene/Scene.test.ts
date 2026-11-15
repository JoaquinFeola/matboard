import { describe, expect, it } from 'vitest';
import { makeRect, makeStroke } from '../testing/fixtures';
import { Scene } from './Scene';

describe('Scene', () => {
  it('encuentra solo los elementos que tocan la región', () => {
    const scene = new Scene();
    const near = makeStroke({ x: 0, y: 0 });
    const far = makeStroke({ x: 1000, y: 1000 });
    scene.load([near, far]);
    expect(scene.query({ minX: -5, minY: -5, maxX: 30, maxY: 10 }).map((e) => e.id)).toEqual([near.id]);
  });

  it('reindexa al mover un elemento', () => {
    const scene = new Scene();
    const rect = makeRect();
    scene.upsert([rect]);
    scene.upsert([{ ...rect, x: 500, y: 500 }]);
    expect(scene.query({ minX: 0, minY: 0, maxX: 50, maxY: 40 })).toHaveLength(0);
    expect(scene.query({ minX: 520, minY: 520, maxX: 530, maxY: 530 })).toHaveLength(1);
  });

  it('devuelve los elementos en orden de dibujo', () => {
    const scene = new Scene();
    const top = makeRect({ z: 10 });
    const bottom = makeRect({ z: 1 });
    scene.load([top, bottom]);
    expect(scene.all().map((e) => e.id)).toEqual([bottom.id, top.id]);
    expect(scene.nextZ()).toBe(11);
  });

  it('avisa cada cambio', () => {
    const scene = new Scene();
    let calls = 0;
    scene.onChange(() => calls++);
    const rect = makeRect();
    scene.upsert([rect]);
    scene.remove([rect.id]);
    scene.remove(['no-existe']);
    expect(calls).toBe(2);
  });
});
