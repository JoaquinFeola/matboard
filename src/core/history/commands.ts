import type { Element } from '../model/element';
import type { Scene } from '../scene/Scene';

/** Una operación sobre la escena que se puede deshacer. */
export interface Command {
  readonly label: string;
  apply(scene: Scene): void;
  revert(scene: Scene): void;
}

export class AddElements implements Command {
  readonly label = 'Agregar';
  constructor(private readonly elements: readonly Element[]) {}
  apply(scene: Scene): void {
    scene.upsert(this.elements);
  }
  revert(scene: Scene): void {
    scene.remove(this.elements.map((e) => e.id));
  }
}

export class RemoveElements implements Command {
  readonly label = 'Borrar';
  constructor(private readonly elements: readonly Element[]) {}
  apply(scene: Scene): void {
    scene.remove(this.elements.map((e) => e.id));
  }
  revert(scene: Scene): void {
    // Cada elemento conserva su `z`, así vuelve a su lugar en el orden de dibujo.
    scene.upsert(this.elements);
  }
}

export class UpdateElements implements Command {
  constructor(
    private readonly before: readonly Element[],
    private readonly after: readonly Element[],
    readonly label = 'Modificar',
  ) {}
  apply(scene: Scene): void {
    scene.upsert(this.after);
  }
  revert(scene: Scene): void {
    scene.upsert(this.before);
  }
}
