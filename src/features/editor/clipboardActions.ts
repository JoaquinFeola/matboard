import { parseClipboardText, toClipboardText } from '@/core/editor/clipboard';
import type { Editor } from '@/core/editor/Editor';
import type { Element } from '@/core/model/element';

/** Copia de respaldo si el portapapeles del sistema no está disponible. */
let memoryClipboard: Element[] = [];

export interface ClipboardHandlers {
  /** Imágenes pegadas (las maneja quien sabe guardarlas). */
  onImages?: (files: File[]) => void;
}

/**
 * Ctrl+C / Ctrl+X copian la selección al portapapeles del sistema (así se puede
 * pegar en otra pizarra); Ctrl+V llega como evento `paste` del navegador.
 * Devuelve la función que quita los listeners.
 */
export function attachClipboard(editor: Editor, handlers: ClipboardHandlers = {}): () => void {
  const isTyping = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  };

  const copy = async (cut: boolean) => {
    const selected = editor.selectedElements();
    if (selected.length === 0) return;
    memoryClipboard = selected;
    try {
      await navigator.clipboard.writeText(toClipboardText(selected));
    } catch {
      // Sin permiso de portapapeles: queda la copia en memoria.
    }
    if (cut) editor.deleteSelected();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || isTyping(e.target)) return;
    const key = e.key.toLowerCase();
    if (key === 'c' || key === 'x') {
      e.preventDefault();
      void copy(key === 'x');
    }
  };

  const onPaste = (e: ClipboardEvent) => {
    if (isTyping(e.target) || document.querySelector('[role="dialog"]')) return;
    const data = e.clipboardData;
    if (!data) return;
    e.preventDefault();

    const images = [...data.files].filter((file) => file.type.startsWith('image/'));
    if (images.length > 0 && handlers.onImages) {
      handlers.onImages(images);
      return;
    }
    const fromSystem = parseClipboardText(data.getData('text/plain'));
    editor.pasteElements(fromSystem ?? memoryClipboard);
  };

  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('paste', onPaste);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('paste', onPaste);
  };
}
