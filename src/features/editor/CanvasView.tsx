import { onCleanup, onMount } from 'solid-js';
import type { Editor } from '@/core/editor/Editor';

/** Monta los dos canvas del motor y los mantiene del tamaño de la ventana. */
export function CanvasView(props: { editor: Editor; onReady?: () => void }) {
  let surface!: HTMLDivElement;
  let staticCanvas!: HTMLCanvasElement;
  let overlayCanvas!: HTMLCanvasElement;

  onMount(() => {
    const { editor } = props;
    editor.mount(overlayCanvas, staticCanvas, overlayCanvas);
    let ready = false;

    const resize = () => {
      const rect = surface.getBoundingClientRect();
      editor.resize(rect.width, rect.height, window.devicePixelRatio || 1);
      if (!ready) {
        ready = true;
        props.onReady?.();
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    // El DPR cambia al mover la ventana a otro monitor o al cambiar la escala de Windows.
    const dprQuery = () => window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    let media = dprQuery();
    const onDprChange = () => {
      media.removeEventListener('change', onDprChange);
      media = dprQuery();
      media.addEventListener('change', onDprChange);
      resize();
    };
    media.addEventListener('change', onDprChange);
    resize();

    onCleanup(() => {
      observer.disconnect();
      media.removeEventListener('change', onDprChange);
    });
  });

  return (
    <div ref={surface} class="absolute inset-0 overflow-hidden bg-paper">
      <canvas ref={staticCanvas} class="absolute inset-0" />
      <canvas ref={overlayCanvas} class="absolute inset-0 touch-none" />
    </div>
  );
}
