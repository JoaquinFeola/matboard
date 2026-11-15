import type { Editor } from '../editor/Editor';
import type { ToolId } from '../tools/types';

const TOOL_KEYS: Record<string, ToolId> = {
  v: 'select',
  h: 'hand',
  p: 'pen',
  b: 'pencil',
  m: 'highlighter',
  e: 'eraser',
  r: 'rect',
  o: 'ellipse',
  l: 'line',
  a: 'arrow',
  t: 'text',
};

/** Atajos del editor. Devuelve true si el evento se usó. */
export function handleEditorShortcut(editor: Editor, e: KeyboardEvent): boolean {
  if (isTyping(e)) return false;
  const key = e.key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;

  if (mod) {
    if (key === 'z' && !e.shiftKey) return run(e, () => editor.undo());
    if ((key === 'z' && e.shiftKey) || key === 'y') return run(e, () => editor.redo());
    if (key === 'a') return run(e, () => editor.selectAll());
    if (key === '=' || key === '+') return run(e, () => editor.zoomIn());
    if (key === '-') return run(e, () => editor.zoomOut());
    if (key === '0') return run(e, () => editor.resetZoom());
    return false;
  }
  if (e.altKey) return false;

  if (key === 'delete' || key === 'backspace') return run(e, () => editor.deleteSelected());
  if (key === 'escape') {
    return run(e, () => {
      if (editor.selection.size > 0) editor.clearSelection();
      else editor.setTool('select');
    });
  }
  if (e.shiftKey && e.code === 'Digit1') return run(e, () => editor.zoomToFit());
  const tool = TOOL_KEYS[key];
  if (tool && !e.shiftKey) return run(e, () => editor.setTool(tool));
  return false;
}

function run(e: KeyboardEvent, action: () => void): true {
  e.preventDefault();
  action();
  return true;
}

function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}
