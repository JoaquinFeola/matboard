import type { Scene } from '../scene/Scene';
import type { Command } from './commands';

export const HISTORY_LIMIT = 200;

/** Pilas de deshacer/rehacer. Guarda comandos, no copias de la escena. */
export class History {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly limit = HISTORY_LIMIT,
  ) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Aplica el comando y lo registra. */
  execute(command: Command): void {
    command.apply(this.scene);
    this.record(command);
  }

  /** Registra un comando cuyo efecto ya está en la escena (p. ej. tras arrastrar). */
  record(command: Command): void {
    this.undoStack.push(command);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  undo(): boolean {
    const command = this.undoStack.pop();
    if (!command) return false;
    command.revert(this.scene);
    this.redoStack.push(command);
    return true;
  }

  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) return false;
    command.apply(this.scene);
    this.undoStack.push(command);
    return true;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
