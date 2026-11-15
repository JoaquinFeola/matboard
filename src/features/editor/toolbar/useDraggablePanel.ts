import { createSignal, onCleanup } from 'solid-js';

export type Orientation = 'horizontal' | 'vertical';

export interface PanelPlacement {
  /** Posición del centro superior del panel, como fracción de la ventana (sobrevive a cambios de tamaño). */
  fx: number;
  fy: number;
  orientation: Orientation;
}

const STORAGE_KEY = 'matboard:toolbar';
const DEFAULT_PLACEMENT: PanelPlacement = { fx: 0.5, fy: 1, orientation: 'horizontal' };
const MARGIN = 12;

function loadPlacement(): PanelPlacement {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as PanelPlacement | null;
    if (raw && typeof raw.fx === 'number' && typeof raw.fy === 'number') return { ...DEFAULT_PLACEMENT, ...raw };
  } catch {
    // Sin almacenamiento disponible: posición por defecto.
  }
  return DEFAULT_PLACEMENT;
}

function savePlacement(placement: PanelPlacement): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placement));
  } catch {
    // Conveniencia, no crítico.
  }
}

/**
 * Panel que se arrastra desde una manija, queda dentro de la ventana y recuerda
 * su lugar y orientación.
 */
export function useDraggablePanel() {
  const [placement, setPlacement] = createSignal(loadPlacement());
  const [viewport, setViewport] = createSignal({ width: window.innerWidth, height: window.innerHeight });
  const [panelSize, setPanelSize] = createSignal({ width: 0, height: 0 });
  let panel: HTMLElement | undefined;
  let drag: { pointerId: number; offsetX: number; offsetY: number } | null = null;

  const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
  window.addEventListener('resize', onResize);
  const observer = new ResizeObserver(() => {
    if (panel) setPanelSize({ width: panel.offsetWidth, height: panel.offsetHeight });
  });
  onCleanup(() => {
    window.removeEventListener('resize', onResize);
    observer.disconnect();
  });

  /** Posición en píxeles (esquina superior izquierda), siempre dentro de la ventana. */
  const position = () => {
    const { width, height } = viewport();
    const size = panelSize();
    const p = placement();
    const left = p.fx * width - size.width / 2;
    const top = p.fy * height;
    return {
      left: clamp(left, MARGIN, width - size.width - MARGIN),
      top: clamp(top, MARGIN, height - size.height - MARGIN),
    };
  };

  const ref = (el: HTMLElement) => {
    panel = el;
    observer.observe(el);
  };

  const onHandlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const current = position();
    drag = { pointerId: e.pointerId, offsetX: e.clientX - current.left, offsetY: e.clientY - current.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onHandlePointerMove = (e: PointerEvent) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const { width, height } = viewport();
    const size = panelSize();
    const left = e.clientX - drag.offsetX;
    const top = e.clientY - drag.offsetY;
    setPlacement({ ...placement(), fx: (left + size.width / 2) / width, fy: top / height });
  };

  const onHandlePointerUp = (e: PointerEvent) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    drag = null;
    // Se guarda la posición ya ajustada a la ventana.
    const { width, height } = viewport();
    const size = panelSize();
    const pos = position();
    const settled = { ...placement(), fx: (pos.left + size.width / 2) / width, fy: pos.top / height };
    setPlacement(settled);
    savePlacement(settled);
  };

  const toggleOrientation = () => {
    const next: PanelPlacement = {
      ...placement(),
      orientation: placement().orientation === 'horizontal' ? 'vertical' : 'horizontal',
    };
    setPlacement(next);
    savePlacement(next);
  };

  return {
    ref,
    position,
    orientation: () => placement().orientation,
    toggleOrientation,
    handleProps: {
      onPointerDown: onHandlePointerDown,
      onPointerMove: onHandlePointerMove,
      onPointerUp: onHandlePointerUp,
      onPointerCancel: onHandlePointerUp,
      onDblClick: toggleOrientation,
    },
  };
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));
