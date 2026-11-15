import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import type { Editor } from '@/core/editor/Editor';
import { SIZE_TABLE } from '@/core/model/palette';
import { TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT } from '@/core/render/text';
import type { TextEditRequest } from '@/core/tools/types';
import { canvasTheme } from '@/state/settings';

/** Textarea sobre el lienzo para escribir o editar un texto. */
export function TextEditorOverlay(props: { editor: Editor }) {
  const [request, setRequest] = createSignal<TextEditRequest | null>(null);
  onCleanup(props.editor.on('textEdit', setRequest));
  return <Show when={request()}>{(r) => <TextArea editor={props.editor} request={r()} />}</Show>;
}

function TextArea(props: { editor: Editor; request: TextEditRequest }) {
  const { editor, request } = props;
  const [camera, setCamera] = createSignal(editor.camera.snapshot);
  let textarea!: HTMLTextAreaElement;
  let committed = false;

  const fontSize = request.element?.size ?? SIZE_TABLE.text[editor.style().sizeKey];
  const color = canvasTheme().mapColor(request.element?.color ?? editor.style().color);

  const commit = () => {
    if (committed) return;
    committed = true;
    editor.commitText(request, textarea.value);
  };

  const autosize = () => {
    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;
    textarea.style.width = '0px';
    textarea.style.width = `${textarea.scrollWidth + 4}px`;
  };

  // Un clic fuera confirma. El lienzo cancela el foco al tocarlo, por eso se escucha aquí.
  const onOutsidePointer = (e: PointerEvent) => {
    if (e.target !== textarea) commit();
  };

  onMount(() => {
    textarea.value = request.element?.text ?? '';
    autosize();
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.select();
    });
    document.addEventListener('pointerdown', onOutsidePointer, true);
  });
  onCleanup(editor.camera.onChange(setCamera));
  onCleanup(() => {
    document.removeEventListener('pointerdown', onOutsidePointer, true);
    commit();
  });

  const screen = () => {
    const c = camera();
    return { x: (request.at.x - c.x) * c.zoom, y: (request.at.y - c.y) * c.zoom, zoom: c.zoom };
  };

  return (
    <textarea
      ref={textarea}
      spellcheck={false}
      wrap="off"
      class="absolute z-10 resize-none overflow-hidden whitespace-pre border-0 bg-transparent p-0 outline-none select-text"
      style={{
        left: `${screen().x}px`,
        top: `${screen().y}px`,
        'font-family': TEXT_FONT_FAMILY,
        'font-size': `${fontSize * screen().zoom}px`,
        'line-height': String(TEXT_LINE_HEIGHT),
        color,
        'caret-color': color,
        'min-width': '2ch',
      }}
      onInput={autosize}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}
