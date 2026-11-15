import { X } from 'lucide-solid';
import { onCleanup, onMount, Show, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { IconButton } from './IconButton';

export interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: JSX.Element;
  footer?: JSX.Element;
  width?: string;
}

/** Diálogo modal. Esc o clic en el fondo lo cierran. */
export function Dialog(props: DialogProps) {
  return (
    <Show when={props.open}>
      <Portal>
        <DialogBody {...props} />
      </Portal>
    </Show>
  );
}

function DialogBody(props: DialogProps) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      props.onClose();
    }
  };
  onMount(() => document.addEventListener('keydown', onKeyDown, true));
  onCleanup(() => document.removeEventListener('keydown', onKeyDown, true));

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onPointerDown={(e) => e.target === e.currentTarget && props.onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        class={`panel flex max-h-[85vh] w-full flex-col ${props.width ?? 'max-w-md'}`}
      >
        <header class="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 class="text-[15px] font-semibold">{props.title}</h2>
          <IconButton label="Cerrar" size="sm" onClick={() => props.onClose()}>
            <X size={16} />
          </IconButton>
        </header>
        <div class="overflow-y-auto px-5 py-4">{props.children}</div>
        <Show when={props.footer}>
          <footer class="flex justify-end gap-2 border-t border-border px-5 py-3">{props.footer}</footer>
        </Show>
      </div>
    </div>
  );
}
