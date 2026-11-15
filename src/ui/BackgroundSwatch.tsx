import type { BackgroundKind } from '@/core/model/board';

export const BACKGROUND_LABELS: Record<BackgroundKind, string> = {
  grid: 'Cuadriculado',
  lined: 'Rayado',
  dots: 'Puntos',
  blank: 'Liso',
};

const LINE = 'color-mix(in srgb, var(--fg) 14%, transparent)';

const PATTERNS: Record<BackgroundKind, string> = {
  grid: `linear-gradient(${LINE} 1px, transparent 1px) 0 0 / 8px 8px, linear-gradient(90deg, ${LINE} 1px, transparent 1px) 0 0 / 8px 8px`,
  lined: `linear-gradient(${LINE} 1px, transparent 1px) 0 0 / 100% 8px`,
  dots: `radial-gradient(${LINE} 1.2px, transparent 1.3px) 0 0 / 8px 8px`,
  blank: 'none',
};

/** Muestra en miniatura del patrón de fondo. */
export function BackgroundSwatch(props: { kind: BackgroundKind; class?: string }) {
  return (
    <span
      aria-hidden="true"
      class={`block rounded-md border border-border bg-paper ${props.class ?? 'size-8'}`}
      style={{ background: `${PATTERNS[props.kind]}, var(--paper)` }}
    />
  );
}
