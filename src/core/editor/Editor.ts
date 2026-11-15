import { Camera } from '../camera/Camera';
import { History } from '../history/History';
import { AddElements, RemoveElements, UpdateElements, type Command } from '../history/commands';
import { InputController, type InputSettings, type InputTarget } from '../input/InputController';
import { isEmpty, unionAll } from '../math/bounds';
import type { Point } from '../math/vec';
import { round } from '../math/vec';
import type { BackgroundKind } from '../model/board';
import { updateElement, type Element, type ElementId, type TextElement } from '../model/element';
import { getElementBounds } from '../model/geometry';
import { INK, SIZE_TABLE, type SizeKey } from '../model/palette';
import { Renderer } from '../render/Renderer';
import { measureText } from '../render/text';
import { LIGHT_THEME, type CanvasTheme } from '../render/theme';
import { Scene } from '../scene/Scene';
import { EraserTool } from '../tools/EraserTool';
import { HandTool } from '../tools/HandTool';
import { PenTool } from '../tools/PenTool';
import { SelectTool } from '../tools/SelectTool';
import { ShapeTool } from '../tools/ShapeTool';
import { TextTool } from '../tools/TextTool';
import type { CurrentStyle, TextEditRequest, Tool, ToolHost, ToolId, ToolPointer } from '../tools/types';
import { createId } from '../util/id';
import { Emitter } from '../util/emitter';
import { cloneElements } from './clipboard';
import { paintSelectionFrame } from './handles';
import { Selection } from './Selection';

/** Lo que la UI necesita mostrar. */
export interface EditorState {
  tool: ToolId;
  color: string;
  sizeKey: SizeKey;
  selectionCount: number;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  background: BackgroundKind;
}

type EditorEvents = {
  state: EditorState;
  /** El contenido cambió (para autoguardar). */
  content: void;
  /** Abrir (o cerrar con null) el editor de texto. */
  textEdit: TextEditRequest | null;
};

export interface EditorOptions {
  background: BackgroundKind;
  theme?: CanvasTheme;
  input: InputSettings;
}

/**
 * Fachada del motor: la UI solo habla con esta clase. No depende de ningún
 * framework de UI.
 */
export class Editor implements ToolHost, InputTarget {
  readonly scene = new Scene();
  readonly camera = new Camera();
  readonly selection = new Selection();
  private readonly history = new History(this.scene);
  private readonly events = new Emitter<EditorEvents>();
  private readonly tools: Record<ToolId, Tool>;
  private activeTool: Tool;
  private gestureTool: Tool | null = null;
  private currentStyle: CurrentStyle = { color: INK, sizeKey: 'm' };
  private canvasTheme: CanvasTheme;
  private backgroundKind: BackgroundKind;
  private input: InputSettings;
  private renderer: Renderer | null = null;
  private controller: InputController | null = null;
  private surface: HTMLElement | null = null;
  private editingTextId: ElementId | null = null;
  private textClosedAt = -Infinity;
  /** Última posición del puntero sobre el lienzo (para pegar ahí). */
  private lastPointer: Point | null = null;
  private suppressContent = false;
  private readonly disposers: (() => void)[] = [];

  constructor(options: EditorOptions) {
    this.backgroundKind = options.background;
    this.canvasTheme = options.theme ?? LIGHT_THEME;
    this.input = options.input;
    this.tools = {
      select: new SelectTool(this),
      hand: new HandTool(this),
      pen: new PenTool('pen', this),
      pencil: new PenTool('pencil', this),
      highlighter: new PenTool('highlighter', this),
      eraser: new EraserTool(this),
      rect: new ShapeTool('rect', this),
      ellipse: new ShapeTool('ellipse', this),
      line: new ShapeTool('line', this),
      arrow: new ShapeTool('arrow', this),
      text: new TextTool(this),
    };
    this.activeTool = this.tools.pen;

    this.disposers.push(
      this.scene.onChange(() => {
        this.selection.retain((id) => this.scene.has(id));
        this.renderer?.invalidateAll();
        if (!this.suppressContent) this.events.emit('content', undefined);
        this.emitState();
      }),
      this.camera.onChange(() => {
        this.renderer?.invalidateAll();
        this.emitState();
      }),
      this.selection.onChange(() => {
        this.renderer?.invalidateOverlay();
        this.emitState();
      }),
    );
  }

  // ── Ciclo de vida ────────────────────────────────────────────────

  /** Conecta el motor a dos canvas superpuestos dentro de `surface`. */
  mount(surface: HTMLElement, staticCanvas: HTMLCanvasElement, overlayCanvas: HTMLCanvasElement): void {
    this.surface = surface;
    this.renderer = new Renderer(staticCanvas, overlayCanvas, {
      scene: this.scene,
      camera: this.camera,
      background: () => this.backgroundKind,
      theme: () => this.canvasTheme,
      hidden: () => this.editingTextId,
      paintOverlay: (ctx) => this.paintOverlay(ctx),
    });
    this.controller = new InputController(overlayCanvas, this);
    this.setCursor(this.activeTool.cursor);
  }

  /** Llamar cuando cambia el tamaño del contenedor. */
  resize(width: number, height: number, dpr: number): void {
    this.renderer?.resize(width, height, dpr);
    this.controller?.updateRect();
  }

  destroy(): void {
    this.renderer?.destroy();
    this.controller?.destroy();
    this.disposers.forEach((dispose) => dispose());
    this.events.clear();
    this.renderer = null;
    this.controller = null;
  }

  on<K extends keyof EditorEvents>(event: K, listener: (payload: EditorEvents[K]) => void): () => void {
    return this.events.on(event, listener);
  }

  // ── Contenido ────────────────────────────────────────────────────

  load(elements: readonly Element[]): void {
    this.suppressContent = true;
    this.scene.load(elements);
    this.suppressContent = false;
    this.history.clear();
    this.selection.clear();
    this.emitState();
  }

  elements(): Element[] {
    return this.scene.all();
  }

  // ── Estado y acciones para la UI ─────────────────────────────────

  get state(): EditorState {
    return {
      tool: this.activeTool.id,
      color: this.currentStyle.color,
      sizeKey: this.currentStyle.sizeKey,
      selectionCount: this.selection.size,
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
      zoom: this.camera.zoom,
      background: this.backgroundKind,
    };
  }

  setTool(id: ToolId): void {
    if (this.activeTool.id === id) return;
    this.activeTool.cancel();
    this.activeTool = this.tools[id];
    if (id !== 'select') this.selection.clear();
    this.setCursor(this.activeTool.cursor);
    this.renderer?.invalidateOverlay();
    this.emitState();
  }

  /** Cambia el color actual y el de la selección, si hay. */
  setColor(color: string): void {
    this.currentStyle = { ...this.currentStyle, color };
    this.updateSelected((element) => updateElement(element, { color }), 'Color');
    this.emitState();
  }

  /** Cambia el tamaño actual y el de la selección, si hay. */
  setSize(sizeKey: SizeKey): void {
    this.currentStyle = { ...this.currentStyle, sizeKey };
    this.updateSelected((element) => resizeElement(element, sizeKey), 'Grosor');
    this.emitState();
  }

  setBackground(kind: BackgroundKind): void {
    this.backgroundKind = kind;
    this.renderer?.invalidateStatic();
    this.emitState();
  }

  setTheme(theme: CanvasTheme): void {
    this.canvasTheme = theme;
    this.renderer?.invalidateAll();
  }

  setInputSettings(settings: InputSettings): void {
    this.input = settings;
  }

  undo(): void {
    this.cancelGesture();
    this.history.undo();
  }

  redo(): void {
    this.cancelGesture();
    this.history.redo();
  }

  deleteSelected(): void {
    const selected = this.selectedElements();
    if (selected.length === 0) return;
    this.execute(new RemoveElements(selected));
  }

  selectAll(): void {
    this.setTool('select');
    this.selection.set(this.scene.all().map((e) => e.id));
  }

  clearSelection(): void {
    this.selection.clear();
  }

  /** Duplica la selección al lado y deja seleccionadas las copias. */
  duplicateSelected(): void {
    const selected = this.selectedElements();
    if (selected.length === 0) return;
    const offset = DUPLICATE_OFFSET / this.camera.zoom;
    this.insertCopies(cloneElements(selected, offset, offset, this.scene.nextZ()));
  }

  /** Pega elementos centrados en el puntero (o en el centro de la vista). */
  pasteElements(elements: readonly Element[]): void {
    if (elements.length === 0) return;
    const bounds = unionAll(elements.map(getElementBounds));
    if (isEmpty(bounds)) return;
    const visible = this.camera.visibleBounds();
    const target = this.lastPointer ?? {
      x: (visible.minX + visible.maxX) / 2,
      y: (visible.minY + visible.maxY) / 2,
    };
    const dx = target.x - (bounds.minX + bounds.maxX) / 2;
    const dy = target.y - (bounds.minY + bounds.maxY) / 2;
    this.insertCopies(cloneElements(elements, dx, dy, this.scene.nextZ()));
  }

  private insertCopies(copies: Element[]): void {
    this.cancelGesture();
    this.execute(new AddElements(copies));
    this.setTool('select');
    this.selection.set(copies.map((e) => e.id));
  }

  selectedElements(): Element[] {
    return [...this.selection.current]
      .map((id) => this.scene.get(id))
      .filter((e): e is Element => e !== undefined);
  }

  zoomIn(): void {
    this.camera.zoomIn();
  }

  zoomOut(): void {
    this.camera.zoomOut();
  }

  resetZoom(): void {
    this.camera.zoomAtCenter(1);
  }

  /** Encuadra todo el contenido (o vuelve al origen si está vacía). */
  zoomToFit(): void {
    this.camera.fit(unionAll(this.scene.all().map(getElementBounds)));
  }

  /** Confirma lo escrito en el editor de texto. */
  commitText(request: TextEditRequest, text: string): void {
    this.editingTextId = null;
    this.textClosedAt = performance.now();
    this.events.emit('textEdit', null);
    const value = text.replace(/\s+$/, '');
    const existing = request.element ? (this.scene.get(request.element.id) as TextElement | undefined) : undefined;

    if (existing) {
      if (value === '') this.execute(new RemoveElements([existing]));
      else if (value !== existing.text) {
        const updated = updateElement(existing, { text: value, ...measureText(value, existing.size) });
        this.execute(new UpdateElements([existing], [updated], 'Texto'));
      } else this.renderer?.invalidateStatic();
      return;
    }
    if (value === '') return;
    const size = SIZE_TABLE.text[this.currentStyle.sizeKey];
    const element: TextElement = {
      id: createId(),
      type: 'text',
      x: round(request.at.x),
      y: round(request.at.y),
      z: this.scene.nextZ(),
      color: this.currentStyle.color,
      size,
      text: value,
      ...measureText(value, size),
    };
    this.execute(new AddElements([element]));
  }

  // ── ToolHost ─────────────────────────────────────────────────────

  theme(): CanvasTheme {
    return this.canvasTheme;
  }

  style(): CurrentStyle {
    return this.currentStyle;
  }

  execute(command: Command): void {
    this.history.execute(command);
  }

  record(command: Command): void {
    this.history.record(command);
    this.emitState();
  }

  requestOverlay(): void {
    this.renderer?.invalidateOverlay();
  }

  setCursor(cursor: string): void {
    if (this.surface) this.surface.style.cursor = cursor;
  }

  beginTextEdit(request: TextEditRequest): void {
    this.editingTextId = request.element?.id ?? null;
    this.renderer?.invalidateStatic();
    this.events.emit('textEdit', request);
  }

  textEditJustClosed(): boolean {
    return performance.now() - this.textClosedAt < 250;
  }

  // ── InputTarget ──────────────────────────────────────────────────

  inputSettings(): InputSettings {
    return this.input;
  }

  routeDown(pointer: ToolPointer, override: 'hand' | 'eraser' | null): void {
    this.lastPointer = pointer.world;
    this.gestureTool = override ? this.tools[override] : this.activeTool;
    this.gestureTool.pointerDown(pointer);
  }

  routeMove(pointer: ToolPointer, isDown: boolean): void {
    this.lastPointer = pointer.world;
    const tool = isDown ? this.gestureTool : this.activeTool;
    if (!isDown && this.controller?.isSpaceHeld) {
      this.setCursor('grab');
      return;
    }
    tool?.pointerMove(pointer, isDown);
  }

  routeUp(pointer: ToolPointer): void {
    const tool = this.gestureTool;
    this.gestureTool = null;
    tool?.pointerUp(pointer);
    this.setCursor(this.activeTool.cursor);
  }

  routeCancel(): void {
    this.cancelGesture();
  }

  routeDoubleClick(pointer: ToolPointer): void {
    this.activeTool.doubleClick?.(pointer);
  }

  // ── Internos ─────────────────────────────────────────────────────

  private cancelGesture(): void {
    this.gestureTool?.cancel();
    this.gestureTool = null;
  }

  private updateSelected(change: (element: Element) => Element, label: string): void {
    const before = this.selectedElements();
    if (before.length === 0) return;
    this.execute(new UpdateElements(before, before.map(change), label));
  }

  private paintOverlay(ctx: CanvasRenderingContext2D): void {
    this.paintSelection(ctx);
    (this.gestureTool ?? this.activeTool).paintOverlay?.(ctx);
  }

  private paintSelection(ctx: CanvasRenderingContext2D): void {
    const select = this.tools.select as SelectTool;
    const withHandles = this.activeTool === select && !select.isTransforming && !this.gestureTool;
    paintSelectionFrame(ctx, this.selectedElements(), this.camera.zoom, this.canvasTheme, withHandles);
  }

  private emitState(): void {
    this.events.emit('state', this.state);
  }
}

/** Separación de un duplicado respecto del original, en píxeles de pantalla. */
const DUPLICATE_OFFSET = 20;

/** Aplica el tamaño elegido según el tipo de elemento. */
function resizeElement(element: Element, sizeKey: SizeKey): Element {
  switch (element.type) {
    case 'stroke':
      return updateElement(element, { size: SIZE_TABLE[element.variant][sizeKey] });
    case 'shape':
      return updateElement(element, { size: SIZE_TABLE.shape[sizeKey] });
    case 'text': {
      const size = SIZE_TABLE.text[sizeKey];
      return updateElement(element, { size, ...measureText(element.text, size) });
    }
  }
}
