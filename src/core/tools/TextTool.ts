import type { Tool, ToolHost, ToolPointer } from './types';
import { findTopElementAt } from './picking';

/** Clic en un texto: lo edita. Clic en vacío: crea uno nuevo. */
export class TextTool implements Tool {
  readonly id = 'text';
  readonly cursor = 'text';

  constructor(private readonly host: ToolHost) {}

  pointerDown(pointer: ToolPointer): void {
    if (this.host.textEditJustClosed()) return;
    const hit = findTopElementAt(this.host, pointer.world);
    if (hit?.type === 'text') {
      this.host.beginTextEdit({ element: hit, at: { x: hit.x, y: hit.y } });
      return;
    }
    this.host.beginTextEdit({ element: null, at: pointer.world });
  }

  pointerMove(): void {}
  pointerUp(): void {}
  cancel(): void {}
}
