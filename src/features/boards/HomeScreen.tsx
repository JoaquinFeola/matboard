import { Plus, Search, Settings } from 'lucide-solid';
import { createMemo, createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { BACKGROUND_KINDS, type BackgroundKind, type BoardMeta } from '@/core/model/board';
import { settings } from '@/state/settings';
import { boardRepository } from '@/storage/platform';
import { BackgroundSwatch, BACKGROUND_LABELS } from '@/ui/BackgroundSwatch';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { IconButton } from '@/ui/IconButton';
import { AppLogo } from '@/ui/AppLogo';
import { BoardCard } from './BoardCard';
import { createBoard, duplicateBoard } from './boardActions';

export interface HomeScreenProps {
  onOpenBoard: (id: string) => void;
  onOpenSettings: () => void;
}

export function HomeScreen(props: HomeScreenProps) {
  const [boards, { refetch, mutate }] = createResource(() => boardRepository.list(), { initialValue: [] });
  const [query, setQuery] = createSignal('');
  const [pendingDelete, setPendingDelete] = createSignal<BoardMeta | null>(null);

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    return q ? boards().filter((b) => b.name.toLowerCase().includes(q)) : boards();
  });

  const create = async (background: BackgroundKind = settings.defaultBackground) => {
    const meta = await createBoard(background);
    props.onOpenBoard(meta.id);
  };

  const rename = async (board: BoardMeta, name: string) => {
    const doc = await boardRepository.load(board.id);
    const meta = { ...board, name };
    await boardRepository.save({ ...doc, meta });
    mutate(boards().map((b) => (b.id === board.id ? meta : b)));
  };

  const duplicate = async (board: BoardMeta) => {
    await duplicateBoard(board);
    refetch();
  };

  const confirmDelete = async () => {
    const board = pendingDelete();
    setPendingDelete(null);
    if (!board) return;
    await boardRepository.remove(board.id);
    mutate(boards().filter((b) => b.id !== board.id));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      void create();
    }
  };
  window.addEventListener('keydown', onKeyDown);
  onCleanup(() => window.removeEventListener('keydown', onKeyDown));

  return (
    <div class="h-full overflow-y-auto">
      <div class="mx-auto max-w-6xl px-8 pb-16 pt-8">
        <header class="flex items-center gap-4">
          <AppLogo />
          <div class="ml-auto flex items-center gap-2">
            <label class="flex h-9 w-64 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-muted focus-within:ring-2 focus-within:ring-accent">
              <Search size={15} />
              <input
                class="w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-muted"
                placeholder="Buscar pizarras"
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
              />
            </label>
            <IconButton label="Configuración" onClick={() => props.onOpenSettings()}>
              <Settings size={18} />
            </IconButton>
          </div>
        </header>

        <section class="mt-10">
          <div class="flex flex-wrap items-stretch gap-3">
            <button
              type="button"
              class="group flex min-w-64 items-center gap-4 rounded-2xl bg-accent px-5 py-4 text-left text-accent-fg shadow-panel transition-colors hover:bg-accent-hover"
              onClick={() => void create()}
            >
              <span class="flex size-11 items-center justify-center rounded-xl bg-white/20">
                <Plus size={22} />
              </span>
              <span>
                <span class="block text-[15px] font-semibold">Nueva pizarra</span>
                <span class="block text-xs opacity-80">
                  {BACKGROUND_LABELS[settings.defaultBackground]} · Ctrl+N
                </span>
              </span>
            </button>
            <For each={BACKGROUND_KINDS}>
              {(kind) => (
                <button
                  type="button"
                  class="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-3 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg"
                  onClick={() => void create(kind)}
                >
                  <BackgroundSwatch kind={kind} class="h-9 w-12" />
                  {BACKGROUND_LABELS[kind]}
                </button>
              )}
            </For>
          </div>
        </section>

        <section class="mt-10">
          <h2 class="mb-4 text-[13px] font-semibold text-muted">Tus pizarras</h2>
          <Show
            when={filtered().length > 0}
            fallback={
              <div class="rounded-2xl border border-dashed border-border-strong px-6 py-16 text-center text-muted">
                {query() ? 'No hay pizarras con ese nombre.' : 'Todavía no hay pizarras. Creá la primera con un clic.'}
              </div>
            }
          >
            <div class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              <For each={filtered()}>
                {(board) => (
                  <BoardCard
                    board={board}
                    onOpen={() => props.onOpenBoard(board.id)}
                    onRename={(name) => void rename(board, name)}
                    onDuplicate={() => void duplicate(board)}
                    onDelete={() => setPendingDelete(board)}
                  />
                )}
              </For>
            </div>
          </Show>
        </section>
      </div>

      <Dialog
        open={pendingDelete() !== null}
        title="Borrar pizarra"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button onClick={() => setPendingDelete(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => void confirmDelete()}>
              Borrar
            </Button>
          </>
        }
      >
        <p class="text-[13px] text-muted">
          Se va a borrar <strong class="text-fg">{pendingDelete()?.name}</strong>. Esta acción no se puede
          deshacer.
        </p>
      </Dialog>
    </div>
  );
}
