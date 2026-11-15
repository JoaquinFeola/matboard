import { splitProps, type JSX, type ParentProps } from 'solid-js';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'bg-surface-2 text-fg hover:bg-surface-3',
  danger: 'bg-danger text-white hover:opacity-90',
  ghost: 'text-fg hover:bg-surface-2',
};

export function Button(
  props: ParentProps<JSX.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>,
) {
  const [local, rest] = splitProps(props, ['variant', 'class', 'children']);
  return (
    <button
      type="button"
      class={`inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-medium transition-colors disabled:opacity-50 ${
        VARIANTS[local.variant ?? 'secondary']
      } ${local.class ?? ''}`}
      {...rest}
    >
      {local.children}
    </button>
  );
}

/** Grupo de opciones excluyentes (tema, rueda, etc.). */
export function Segmented<T extends string>(props: {
  value: T;
  options: readonly { value: T; label: string; icon?: JSX.Element }[];
  onChange: (value: T) => void;
}) {
  return (
    <div class="inline-flex rounded-xl bg-surface-2 p-1">
      {props.options.map((option) => (
        <button
          type="button"
          class={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] transition-colors ${
            props.value === option.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
          }`}
          onClick={() => props.onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
