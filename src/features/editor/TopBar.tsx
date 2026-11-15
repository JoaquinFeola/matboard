import { Check, ChevronLeft, Download, FileCode, Image, Redo2, Settings, Undo2 } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';
import type { Editor, EditorState } from '@/core/editor/Editor';
import { BACKGROUND_KINDS, type BackgroundKind, type BoardMeta } from '@/core/model/board';
import { BackgroundSwatch, BACKGROUND_LABELS } from '@/ui/BackgroundSwatch';
import { IconButton } from '@/ui/IconButton';
import { MenuItem, Popover } from '@/ui/Popover';
import type { ExportRequest } from './exportBoard';

export interface TopBarProps {
  editor: Editor;
  state: EditorState;
  meta: BoardMeta;
  onBack: () => void;
  onRename: (name: string) => void;
  onBackground: (kind: BackgroundKind) => void;
  onExport: (request: ExportRequest) => void;
  onOpenSettings: () => void;
}

/** Paneles de las esquinas superiores: navegación y nombre a la izquierda, acciones a la derecha. */
export function TopBar(props: TopBarProps) {
  return (
    <>
      <div class="panel fixed left-3 top-3 z-20 flex h-12 items-center gap-1 pl-1.5 pr-3">
        <IconButton label="Pizarras" onClick={() => props.onBack()}>
          <ChevronLeft size={19} />
        </IconButton>
        <BoardName name={props.meta.name} onRename={props.onRename} />
      </div>

      <div class="panel fixed right-3 top-3 z-20 flex h-12 items-center gap-0.5 px-1.5">
        <IconButton label="Deshacer" shortcut="Ctrl+Z" disabled={!props.state.canUndo} onClick={() => props.editor.undo()}>
          <Undo2 size={18} />
        </IconButton>
        <IconButton label="Rehacer" shortcut="Ctrl+Y" disabled={!props.state.canRedo} onClick={() => props.editor.redo()}>
          <Redo2 size={18} />
        </IconButton>
        <span class="mx-1 h-6 w-px bg-border" />
        <BackgroundMenu value={props.meta.background} onChange={props.onBackground} />
        <ExportMenu hasSelection={props.state.selectionCount > 0} onExport={props.onExport} />
        <IconButton label="Configuración" onClick={() => props.onOpenSettings()}>
          <Settings size={18} />
        </IconButton>
      </div>
    </>
  );
}

function BoardName(props: { name: string; onRename: (name: string) => void }) {
  let input!: HTMLInputElement;
  const commit = () => {
    const value = input.value.trim();
    if (value && value !== props.name) props.onRename(value);
    else input.value = props.name;
  };
  return (
    <input
      ref={input}
      aria-label="Nombre de la pizarra"
      class="w-56 truncate rounded-lg bg-transparent px-2 py-1 text-[13px] font-medium outline-none hover:bg-surface-2 focus:bg-surface-2 focus:ring-2 focus:ring-accent"
      value={props.name}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
          input.value = props.name;
          input.blur();
        }
      }}
    />
  );
}

function BackgroundMenu(props: { value: BackgroundKind; onChange: (kind: BackgroundKind) => void }) {
  return (
    <Popover
      align="end"
      class="w-48"
      trigger={(open, toggle) => (
        <IconButton label="Fondo" active={open()} onClick={toggle}>
          <BackgroundSwatch kind={props.value} class="size-[18px] rounded-[5px]" />
        </IconButton>
      )}
    >
      {(close) => (
        <For each={BACKGROUND_KINDS}>
          {(kind) => (
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-[13px] hover:bg-surface-2"
              onClick={() => {
                props.onChange(kind);
                close();
              }}
            >
              <BackgroundSwatch kind={kind} class="h-7 w-9" />
              <span class="flex-1 text-left">{BACKGROUND_LABELS[kind]}</span>
              <Show when={props.value === kind}>
                <Check size={15} class="text-accent" />
              </Show>
            </button>
          )}
        </For>
      )}
    </Popover>
  );
}

function ExportMenu(props: { hasSelection: boolean; onExport: (request: ExportRequest) => void }) {
  const [withBackground, setWithBackground] = createSignal(true);
  const [onlySelection, setOnlySelection] = createSignal(false);

  const Toggle = (p: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <label class={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-[13px] ${p.disabled ? 'opacity-40' : ''}`}>
      {p.label}
      <input
        type="checkbox"
        class="size-4 accent-[var(--accent)]"
        checked={p.value}
        disabled={p.disabled}
        onChange={(e) => p.onChange(e.currentTarget.checked)}
      />
    </label>
  );

  return (
    <Popover
      align="end"
      class="w-56"
      trigger={(open, toggle) => (
        <IconButton label="Exportar" active={open()} onClick={toggle}>
          <Download size={18} />
        </IconButton>
      )}
    >
      {(close) => {
        const run = (format: 'png' | 'svg') => {
          close();
          props.onExport({
            format,
            withBackground: withBackground(),
            onlySelection: onlySelection() && props.hasSelection,
          });
        };
        return (
          <>
            <MenuItem icon={<Image size={15} />} label="Imagen PNG" onClick={() => run('png')} />
            <MenuItem icon={<FileCode size={15} />} label="Vector SVG" onClick={() => run('svg')} />
            <div class="my-1 h-px bg-border" />
            <Toggle label="Incluir fondo" value={withBackground()} onChange={setWithBackground} />
            <Toggle
              label="Solo la selección"
              value={onlySelection() && props.hasSelection}
              onChange={setOnlySelection}
              disabled={!props.hasSelection}
            />
          </>
        );
      }}
    </Popover>
  );
}
