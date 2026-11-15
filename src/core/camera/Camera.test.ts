import { describe, expect, it } from 'vitest';
import { Camera, MAX_ZOOM } from './Camera';

describe('Camera', () => {
  it('convierte pantalla ↔ mundo', () => {
    const camera = new Camera();
    camera.set({ x: 100, y: 50, zoom: 2 });
    const world = camera.screenToWorld(20, 40);
    expect(world).toEqual({ x: 110, y: 70 });
    expect(camera.worldToScreen(world.x, world.y)).toEqual({ x: 20, y: 40 });
  });

  it('el zoom mantiene fijo el punto bajo el cursor', () => {
    const camera = new Camera();
    camera.setViewport(800, 600);
    const before = camera.screenToWorld(300, 200);
    camera.zoomAt(300, 200, 3);
    const after = camera.screenToWorld(300, 200);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('limita el zoom', () => {
    const camera = new Camera();
    camera.zoomAt(0, 0, 999);
    expect(camera.zoom).toBe(MAX_ZOOM);
  });

  it('acercar y alejar recorren pasos', () => {
    const camera = new Camera();
    camera.setViewport(800, 600);
    camera.zoomIn();
    expect(camera.zoom).toBe(1.25);
    camera.zoomOut();
    camera.zoomOut();
    expect(camera.zoom).toBe(0.8);
  });
});
