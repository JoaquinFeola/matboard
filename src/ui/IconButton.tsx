import { splitProps, type JSX, type ParentProps } from 'solid-js';

type Size = 'sm' | 'md';

export interface IconButtonProps extends ParentProps<JSX.ButtonHTMLAttributes<HTMLButtonElement>> {
  label: string;
  shortcut?: string;
  active?: boolean;
  size?: Size;
  tipSide?: 'bottom' | 'top' | 'right';
}

const SIZES: Record<Size, string> = { sm: 'size-8 rounded-lg', md: 'size-9 rounded-xl' };

/** Botón cuadrado con ícono, tooltip y estado activo. */
export function IconButton(props: IconButtonProps) {
  const [local, rest] = splitProps(props, ['label', 'shortcut', 'active', 'size', 'tipSide', 'class', 'children']);
  return (
    <button
      type="button"
      aria-label={local.label}
      aria-pressed={local.active}
      data-tip={local.shortcut ? `${local.label} · ${local.shortcut}` : local.label}
      data-tip-side={local.tipSide}
      class={`inline-flex shrink-0 items-center justify-center transition-colors disabled:opacity-35 disabled:pointer-events-none ${SIZES[local.size ?? 'md']} ${
        local.active
          ? 'bg-accent-soft text-accent'
          : 'text-fg/75 hover:bg-surface-2 hover:text-fg active:bg-surface-3'
      } ${local.class ?? ''}`}
      {...rest}
    >
      {local.children}
    </button>
  );
}
