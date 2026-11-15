import { Copy, Ellipsis, PencilLine, Trash2 } from 'lucide-solid';
import { createSignal, Show } from 'solid-js';
import type { BoardMeta } from '@/core/model/board';
import { BackgroundSwatch } from '@/ui/BackgroundSwatch';
import { MenuItem, Popover } from '@/ui/Popover';
import { formatUpdatedAt } from './boardActions';

export interface BoardCardProps {
  board: BoardMeta;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function BoardCard(props: BoardCardProps) {
  const [renaming, setRenaming] = createSignal(false);

  const finishRename = (input: HTMLInputElement) => {
    const name = input.value.trim();
    setRenaming(false);
    if (name && name !== props.board.name) props.onRename(name);
  };

  return (
    <article class="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-shadow hover:shadow-panel">
      <button
        type="button"
        class="relative aspect-[16/10] overflow-hidden border-b border-border"
        aria-label={`Abrir ${props.board.name}`}
        onClick={() => props.onOpen()}
      >
        <BackgroundSwatch kind={props.board.background} class="absolute inset-0 rounded-none border-0" />
        <Show when={props.board.thumbnail}>
          <img
            src={props.board.thumbnail}
            alt=""
            draggable={false}
            class="thumb-adapt absolute inset-0 m-auto max-h-[86%] max-w-[90%] object-contain"
          />
        </Show>
      </button>

      <div class="flex items-center gap-2 px-3.5 py-3">
        <div class="min-w-0 flex-1">
          <Show
            when={renaming()}
            fallback={
              <h3 class="truncate text-[13px] font-medium" onDblClick={() => setRenaming(true)}>
                {props.board.name}
              </h3>
            }
          >
            <input
              ref={(el) => queueMicrotask(() => el.select())}
              class="w-full rounded-md bg-surface-2 px-1.5 py-0.5 text-[13px] outline-none ring-2 ring-accent"
              value={props.board.name}
              onBlur={(e) => finishRename(e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') setRenaming(false);
              }}
            />
          </Show>
          <p class="mt-0.5 text-xs text-muted">{formatUpdatedAt(props.board.updatedAt)}</p>
        </div>

        <Popover
          align="end"
          class="w-44"
          trigger={(open, toggle) => (
            <button
              type="button"
              aria-label="Opciones"
              class={`inline-flex size-7 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg ${
                open() ? 'bg-surface-2 text-fg' : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={toggle}
            >
              <Ellipsis size={16} />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuItem icon={<PencilLine size={15} />} label="Renombrar" onClick={() => (close(), setRenaming(true))} />
              <MenuItem icon={<Copy size={15} />} label="Duplicar" onClick={() => (close(), props.onDuplicate())} />
              <MenuItem
                icon={<Trash2 size={15} />}
                label="Borrar"
                danger
                onClick={() => (close(), props.onDelete())}
              />
            </>
          )}
        </Popover>
      </div>
    </article>
  );
}
