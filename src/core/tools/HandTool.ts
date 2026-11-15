import type { Point } from '../math/vec';
import type { Tool, ToolHost, ToolPointer } from './types';

/** Mueve la vista arrastrando. También se usa de forma temporal (espacio, botón medio). */
export class HandTool implements Tool {
  readonly id = 'hand';
  readonly cursor = 'grab';
  private last: Point | null = null;

  constructor(private readonly host: ToolHost) {}

  pointerDown(pointer: ToolPointer): void {
    this.last = pointer.screen;
    this.host.setCursor('grabbing');
  }

  pointerMove(pointer: ToolPointer, isDown: boolean): void {
    if (!isDown || !this.last) return;
    this.host.camera.panBy(pointer.screen.x - this.last.x, pointer.screen.y - this.last.y);
    this.last = pointer.screen;
  }

  pointerUp(): void {
    this.last = null;
    this.host.setCursor(this.cursor);
  }

  cancel(): void {
    this.pointerUp();
  }
}
