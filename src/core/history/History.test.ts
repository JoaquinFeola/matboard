import { describe, expect, it } from 'vitest';
import { Scene } from '../scene/Scene';
import { makeRect, makeStroke } from '../testing/fixtures';
import { History } from './History';
import { AddElements, RemoveElements, UpdateElements } from './commands';

describe('History', () => {
  it('deshace y rehace agregar', () => {
    const scene = new Scene();
    const history = new History(scene);
    history.execute(new AddElements([makeStroke()]));
    expect(scene.size).toBe(1);
    history.undo();
    expect(scene.size).toBe(0);
    history.redo();
    expect(scene.size).toBe(1);
  });

  it('restaura lo borrado en su orden original', () => {
    const scene = new Scene();
    const a = makeRect({ z: 1 });
    const b = makeRect({ z: 2 });
    const c = makeRect({ z: 3 });
    scene.load([a, b, c]);
    const history = new History(scene);
    history.execute(new RemoveElements([b]));
    history.undo();
    expect(scene.all().map((e) => e.id)).toEqual([a.id, b.id, c.id]);
  });

  it('deshace una modificación', () => {
    const scene = new Scene();
    const rect = makeRect();
    scene.load([rect]);
    const history = new History(scene);
    history.execute(new UpdateElements([rect], [{ ...rect, x: 99 }]));
    expect(scene.get(rect.id)?.x).toBe(99);
    history.undo();
    expect(scene.get(rect.id)?.x).toBe(0);
  });

  it('una acción nueva descarta lo que se podía rehacer', () => {
    const scene = new Scene();
    const history = new History(scene);
    history.execute(new AddElements([makeStroke()]));
    history.undo();
    history.execute(new AddElements([makeStroke()]));
    expect(history.canRedo).toBe(false);
  });

  it('respeta el límite', () => {
    const scene = new Scene();
    const history = new History(scene, 3);
    for (let i = 0; i < 5; i++) history.execute(new AddElements([makeStroke()]));
    let undos = 0;
    while (history.undo()) undos++;
    expect(undos).toBe(3);
  });
});
