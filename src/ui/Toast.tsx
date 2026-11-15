import { createContext, createSignal, For, useContext, type ParentProps } from 'solid-js';

type Tone = 'info' | 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

interface ToastApi {
  show(message: string, tone?: Tone): void;
}

const ToastContext = createContext<ToastApi>();
const DURATION_MS = 2600;

/** Avisos breves abajo al centro. */
export function ToastProvider(props: ParentProps) {
  const [items, setItems] = createSignal<ToastItem[]>([]);
  let nextId = 1;

  const api: ToastApi = {
    show(message, tone = 'info') {
      const id = nextId++;
      setItems((list) => [...list, { id, message, tone }]);
      setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), DURATION_MS);
    },
  };

  const toneClass: Record<Tone, string> = {
    info: 'bg-fg text-bg',
    success: 'bg-fg text-bg',
    error: 'bg-danger text-white',
  };

  return (
    <ToastContext.Provider value={api}>
      {props.children}
      <div class="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2" aria-live="polite">
        <For each={items()}>
          {(item) => (
            <div class={`rounded-xl px-4 py-2 text-[13px] font-medium shadow-panel ${toneClass[item.tone]}`}>
              {item.message}
            </div>
          )}
        </For>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast necesita <ToastProvider>');
  return api;
}
