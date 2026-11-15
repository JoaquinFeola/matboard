import { ChevronDown, GripVertical, Plus } from 'lucide-solid';
import { createMemo, createSignal, For, Show } from 'solid-js';
import type { Editor, EditorState } from '@/core/editor/Editor';
import { INK_COLORS, SIZE_KEYS, type SizeKey } from '@/core/model/palette';
import type { ToolId } from '@/core/tools/types';
import { resolvedTheme } from '@/state/settings';
import { IconButton } from '@/ui/IconButton';
import { Popover } from '@/ui/Popover';
import { DRAW_TOOLS, isShapeTool, NAV_TOOLS, SHAPE_TOOLS, TEXT_TOOL, type ToolDef } from './toolDefs';
import { useDraggablePanel } from './useDraggablePanel';

const SIZE_LABELS: Record<SizeKey, string> = { s: 'Fino', m: 'Medio', l: 'Grueso', xl: 'Muy grueso' };
const SIZE_DOTS: Record<SizeKey, number> = { s: 4, m: 7, l: 10, xl: 14 };

export interface ToolbarProps {
  editor: Editor;
  state: EditorState;
}

/** Barra flotante: herramientas, colores y grosores. Se arrastra desde la manija. */
export function Toolbar(props: ToolbarProps) {
  const panel = useDraggablePanel();
  const vertical = () => panel.orientation() === 'vertical';
  const tipSide = () => (vertical() ? 'right' : 'bottom');
  const [lastShape, setLastShape] = createSignal<ToolDef>(SHAPE_TOOLS[0]);
  const currentShape = createMemo(() => SHAPE_TOOLS.find((t) => t.id === props.state.tool) ?? lastShape());

  const selectTool = (id: ToolId) => props.editor.setTool(id);

  const ToolButton = (p: { tool: ToolDef }) => (
    <IconButton
      label={p.tool.label}
      shortcut={p.tool.shortcut}
      tipSide={tipSide()}
      active={props.state.tool === p.tool.id}
      onClick={() => selectTool(p.tool.id)}
    >
      {p.tool.icon(19)}
    </IconButton>
  );

  const Divider = () => <span class={vertical() ? 'my-1 h-px w-6 bg-border' : 'mx-1 h-6 w-px bg-border'} />;

  /** En tema oscuro la tinta negra se muestra clara, igual que en el lienzo. */
  const swatchColor = (value: string) => (value === INK_COLORS[0].value && resolvedTheme() === 'dark' ? '#ececec' : value);
  const isCustomColor = () => !INK_COLORS.some((c) => c.value === props.state.color);

  return (
    <div
      ref={panel.ref}
      class={`panel fixed z-30 flex items-center gap-0.5 p-1.5 ${vertical() ? 'flex-col' : 'flex-row'}`}
      style={{ left: `${panel.position().left}px`, top: `${panel.position().top}px` }}
    >
      <div
        class={`flex cursor-grab items-center justify-center text-muted hover:text-fg active:cursor-grabbing ${
          vertical() ? 'h-5 w-9 rotate-90' : 'h-9 w-5'
        }`}
        data-tip="Arrastrar · doble clic para girar"
        data-tip-side={tipSide()}
        {...panel.handleProps}
      >
        <GripVertical size={16} />
      </div>

      <For each={NAV_TOOLS}>{(tool) => <ToolButton tool={tool} />}</For>
      <Divider />
      <For each={DRAW_TOOLS}>{(tool) => <ToolButton tool={tool} />}</For>
      <Divider />

      <div class={`flex items-center ${vertical() ? 'flex-col' : ''}`}>
        <IconButton
          label={currentShape().label}
          shortcut={currentShape().shortcut}
          tipSide={tipSide()}
          active={isShapeTool(props.state.tool)}
          onClick={() => selectTool(currentShape().id)}
        >
          {currentShape().icon(19)}
        </IconButton>
        <Popover
          side={vertical() ? 'right' : 'bottom'}
          align="center"
          trigger={(open, toggle) => (
            <button
              type="button"
              aria-label="Más formas"
              class={`flex items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg ${
                vertical() ? 'h-4 w-9' : 'h-9 w-4'
              } ${open() ? 'bg-surface-2' : ''}`}
              onClick={toggle}
            >
              <ChevronDown size={13} class={vertical() ? '-rotate-90' : ''} />
            </button>
          )}
        >
          {(close) => (
            <div class="flex gap-0.5">
              <For each={SHAPE_TOOLS}>
                {(tool) => (
                  <IconButton
                    label={tool.label}
                    shortcut={tool.shortcut}
                    active={props.state.tool === tool.id}
                    onClick={() => {
                      setLastShape(tool);
                      selectTool(tool.id);
                      close();
                    }}
                  >
                    {tool.icon(19)}
                  </IconButton>
                )}
              </For>
            </div>
          )}
        </Popover>
      </div>
      <ToolButton tool={TEXT_TOOL} />
      <Divider />

      <div class={`grid gap-1 p-0.5 ${vertical() ? 'grid-cols-2' : 'grid-flow-col'}`}>
        <For each={INK_COLORS}>
          {(color) => (
            <button
              type="button"
              aria-label={color.label}
              data-tip={color.label}
              data-tip-side={tipSide()}
              class={`size-6 rounded-full border border-black/10 transition-transform hover:scale-110 ${
                props.state.color === color.value ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
              }`}
              style={{ background: swatchColor(color.value) }}
              onClick={() => props.editor.setColor(color.value)}
            />
          )}
        </For>
        <label
          data-tip="Otro color"
          data-tip-side={tipSide()}
          class={`relative flex size-6 items-center justify-center overflow-hidden rounded-full border border-border-strong text-muted hover:text-fg ${
            isCustomColor() ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
          }`}
          style={isCustomColor() ? { background: props.state.color } : {}}
        >
          <Show when={!isCustomColor()}>
            <Plus size={13} />
          </Show>
          <input
            type="color"
            class="absolute inset-0 cursor-default opacity-0"
            value={isCustomColor() ? props.state.color : '#0ea5e9'}
            onChange={(e) => props.editor.setColor(e.currentTarget.value)}
          />
        </label>
      </div>
      <Divider />

      <div class={`flex items-center gap-0.5 ${vertical() ? 'flex-col' : ''}`}>
        <For each={SIZE_KEYS}>
          {(key) => (
            <IconButton
              label={SIZE_LABELS[key]}
              tipSide={tipSide()}
              size="sm"
              active={props.state.sizeKey === key}
              onClick={() => props.editor.setSize(key)}
            >
              <span class="rounded-full bg-current" style={{ width: `${SIZE_DOTS[key]}px`, height: `${SIZE_DOTS[key]}px` }} />
            </IconButton>
          )}
        </For>
      </div>
    </div>
  );
}
