import { createSignal, onCleanup, Show, type JSX } from 'solid-js';

export interface PopoverProps {
  /** Botón que abre el panel; recibe si está abierto y cómo alternarlo. */
  trigger: (open: () => boolean, toggle: () => void) => JSX.Element;
  children: (close: () => void) => JSX.Element;
  align?: 'start' | 'end' | 'center';
  side?: 'bottom' | 'top' | 'right';
  class?: string;
}

/** Panel desplegable que se cierra con clic afuera o Esc. */
export function Popover(props: PopoverProps) {
  const [open, setOpen] = createSignal(false);
  let root: HTMLDivElement | undefined;

  const close = () => setOpen(false);
  const toggle = () => setOpen((v) => !v);

  const onPointerDown = (e: PointerEvent) => {
    if (open() && root && !root.contains(e.target as Node)) close();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (open() && e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown, true);
  onCleanup(() => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('keydown', onKeyDown, true);
  });

  const position = () => {
    const side = props.side ?? 'bottom';
    if (side === 'right') return 'left-full top-0 ml-2';
    const vertical = side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
    const align = props.align ?? 'start';
    const horizontal = align === 'end' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0';
    return `${vertical} ${horizontal}`;
  };

  return (
    <div ref={root} class="relative">
      {props.trigger(open, toggle)}
      <Show when={open()}>
        <div class={`panel absolute z-40 p-1.5 ${position()} ${props.class ?? ''}`}>{props.children(close)}</div>
      </Show>
    </div>
  );
}

/** Opción de menú. */
export function MenuItem(props: {
  icon?: JSX.Element;
  label: string;
  hint?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-2 ${
        props.danger ? 'text-danger' : 'text-fg'
      }`}
      onClick={() => props.onClick()}
    >
      {props.icon}
      <span class="flex-1 whitespace-nowrap">{props.label}</span>
      {props.hint && <span class="text-xs text-muted">{props.hint}</span>}
    </button>
  );
}
