import { Maximize, Minus, Plus } from 'lucide-solid';
import type { Editor } from '@/core/editor/Editor';
import { IconButton } from '@/ui/IconButton';

export function ZoomControls(props: { editor: Editor; zoom: number }) {
  return (
    <div class="panel fixed bottom-3 left-3 z-20 flex h-11 items-center gap-0.5 px-1">
      <IconButton label="Alejar" shortcut="Ctrl −" tipSide="top" size="sm" onClick={() => props.editor.zoomOut()}>
        <Minus size={16} />
      </IconButton>
      <button
        type="button"
        data-tip="Volver a 100% · Ctrl 0"
        data-tip-side="top"
        class="h-8 w-14 rounded-lg text-[13px] tabular-nums text-fg/80 hover:bg-surface-2"
        onClick={() => props.editor.resetZoom()}
      >
        {Math.round(props.zoom * 100)}%
      </button>
      <IconButton label="Acercar" shortcut="Ctrl +" tipSide="top" size="sm" onClick={() => props.editor.zoomIn()}>
        <Plus size={16} />
      </IconButton>
      <span class="mx-0.5 h-5 w-px bg-border" />
      <IconButton label="Ver todo" shortcut="Shift+1" tipSide="top" size="sm" onClick={() => props.editor.zoomToFit()}>
        <Maximize size={15} />
      </IconButton>
    </div>
  );
}
