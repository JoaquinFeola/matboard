import { createEffect, createResource, createSignal, Match, onCleanup, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Editor } from '@/core/editor/Editor';
import { handleEditorShortcut } from '@/core/input/shortcuts';
import type { BackgroundKind, BoardDocument, BoardMeta } from '@/core/model/board';
import { canvasTheme, settings } from '@/state/settings';
import { boardRepository } from '@/storage/platform';
import { Button } from '@/ui/Button';
import { createAutosave } from './autosave';
import { CanvasView } from './CanvasView';
import { exportBoard, type ExportRequest } from './exportBoard';
import { TextEditorOverlay } from './TextEditorOverlay';
import { Toolbar } from './toolbar/Toolbar';
import { TopBar } from './TopBar';
import { ZoomControls } from './ZoomControls';
import { useToast } from '@/ui/Toast';

export interface EditorScreenProps {
  boardId: string;
  onBack: () => void;
  onOpenSettings: () => void;
}

/** Carga la pizarra y muestra el editor. */
export function EditorScreen(props: EditorScreenProps) {
  const [doc] = createResource(() => props.boardId, (id) => boardRepository.load(id));
  return (
    <Switch>
      <Match when={doc.error}>
        <div class="flex h-full flex-col items-center justify-center gap-4 text-muted">
          <p>No se pudo abrir la pizarra.</p>
          <Button onClick={() => props.onBack()}>Volver</Button>
        </div>
      </Match>
      <Match when={doc()}>{(loaded) => <BoardEditor doc={loaded()} {...props} />}</Match>
    </Switch>
  );
}

function BoardEditor(props: EditorScreenProps & { doc: BoardDocument }) {
  const toast = useToast();
  const [meta, setMeta] = createSignal<BoardMeta>(props.doc.meta);
  const editor = new Editor({
    background: props.doc.meta.background,
    theme: canvasTheme(),
    input: { wheelMode: settings.wheelMode, touchMode: settings.touchMode },
  });
  editor.load(props.doc.elements);

  const [state, setState] = createStore(editor.state);
  onCleanup(editor.on('state', (next) => setState(next)));

  const autosave = createAutosave(editor, meta, boardRepository, () =>
    toast.show('No se pudo guardar la pizarra', 'error'),
  );
  onCleanup(editor.on('content', () => autosave.schedule()));

  createEffect(() => editor.setTheme(canvasTheme()));
  createEffect(() => editor.setInputSettings({ wheelMode: settings.wheelMode, touchMode: settings.touchMode }));

  const onKeyDown = (e: KeyboardEvent) => {
    if (document.querySelector('[role="dialog"]')) return;
    handleEditorShortcut(editor, e);
  };
  window.addEventListener('keydown', onKeyDown);

  onCleanup(() => {
    window.removeEventListener('keydown', onKeyDown);
    void autosave.flush().finally(() => autosave.dispose());
    editor.destroy();
  });

  const updateMeta = (patch: Partial<BoardMeta>) => {
    setMeta({ ...meta(), ...patch });
    autosave.schedule();
  };

  const changeBackground = (background: BackgroundKind) => {
    editor.setBackground(background);
    updateMeta({ background });
  };

  const back = async () => {
    await autosave.flush();
    props.onBack();
  };

  const runExport = async (request: ExportRequest) => {
    try {
      const done = await exportBoard(editor, meta(), canvasTheme(), request);
      if (done) toast.show('Exportado', 'success');
      else if (editor.elements().length === 0) toast.show('La pizarra está vacía');
    } catch {
      toast.show('No se pudo exportar', 'error');
    }
  };

  /** Al abrir: encuadra el contenido, o deja visible el margen si está vacía. */
  const onCanvasReady = () => {
    if (editor.elements().length > 0) editor.zoomToFit();
    else editor.camera.set({ x: -72, y: -48, zoom: 1 });
  };

  return (
    <div class="relative h-full">
      <CanvasView editor={editor} onReady={onCanvasReady} />
      <TextEditorOverlay editor={editor} />
      <TopBar
        editor={editor}
        state={state}
        meta={meta()}
        onBack={() => void back()}
        onRename={(name) => updateMeta({ name })}
        onBackground={changeBackground}
        onExport={(request) => void runExport(request)}
        onOpenSettings={props.onOpenSettings}
      />
      <Toolbar editor={editor} state={state} />
      <ZoomControls editor={editor} zoom={state.zoom} />
    </div>
  );
}
