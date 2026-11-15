import type { Camera } from '../camera/Camera';
import type { Point } from '../math/vec';
import type { PointerSample, ToolPointer } from '../tools/types';

export type WheelMode = 'pan' | 'zoom';
export type TouchMode = 'navigate' | 'draw';

export interface InputSettings {
  wheelMode: WheelMode;
  touchMode: TouchMode;
}

/** A dónde va cada gesto. Lo implementa el Editor. */
export interface InputTarget {
  readonly camera: Camera;
  inputSettings(): InputSettings;
  /** Herramienta activa, o una temporal ('hand' con espacio/botón medio, 'eraser' con la goma del lápiz). */
  routeDown(pointer: ToolPointer, override: 'hand' | 'eraser' | null): void;
  routeMove(pointer: ToolPointer, isDown: boolean): void;
  routeUp(pointer: ToolPointer): void;
  routeCancel(): void;
  routeDoubleClick(pointer: ToolPointer): void;
}

const WHEEL_ZOOM_SPEED = 0.0015;
const PINCH_ZOOM_SPEED = 0.01;

/**
 * Traduce eventos del DOM en gestos: dibujar con la herramienta activa, mover la
 * vista (espacio, botón medio, dedo), zoom con rueda/pinza, y rechazo de la palma
 * mientras se usa el lápiz.
 */
export class InputController {
  private rect: DOMRect;
  private activePointer: number | null = null;
  private spaceHeld = false;
  private penActive = false;
  private readonly touches = new Map<number, Point>();
  private pinch: { distance: number; center: Point } | null = null;
  private readonly disposers: (() => void)[] = [];

  constructor(
    private readonly surface: HTMLElement,
    private readonly target: InputTarget,
  ) {
    this.rect = surface.getBoundingClientRect();
    this.listen(surface, 'pointerdown', this.onPointerDown);
    this.listen(surface, 'pointermove', this.onPointerMove);
    this.listen(surface, 'pointerup', this.onPointerUp);
    this.listen(surface, 'pointercancel', this.onPointerCancel);
    this.listen(surface, 'pointerleave', this.onPointerLeave);
    this.listen(surface, 'dblclick', this.onDoubleClick);
    this.listen(surface, 'wheel', this.onWheel, { passive: false });
    this.listen(surface, 'contextmenu', (e: Event) => e.preventDefault());
    this.listen(window, 'keydown', this.onKeyDown);
    this.listen(window, 'keyup', this.onKeyUp);
    this.listen(window, 'blur', () => (this.spaceHeld = false));
  }

  get isSpaceHeld(): boolean {
    return this.spaceHeld;
  }

  /** Llamar cuando cambia el tamaño o la posición del lienzo. */
  updateRect(): void {
    this.rect = this.surface.getBoundingClientRect();
  }

  destroy(): void {
    this.disposers.forEach((dispose) => dispose());
    this.disposers.length = 0;
  }

  private listen<K extends string>(
    node: HTMLElement | Window,
    type: K,
    handler: (e: never) => void,
    options?: AddEventListenerOptions,
  ): void {
    const listener = handler as EventListener;
    node.addEventListener(type, listener, options);
    this.disposers.push(() => node.removeEventListener(type, listener, options));
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'touch' && this.handleTouchDown(e)) return;
    if (this.activePointer !== null) return;
    if (e.button !== 0 && e.button !== 1 && e.button !== 5) return;

    this.activePointer = e.pointerId;
    this.capture(e.pointerId);
    if (e.pointerType === 'pen') this.penActive = true;

    const isPenEraser = e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32) !== 0);
    const override = e.button === 1 || this.spaceHeld ? 'hand' : isPenEraser ? 'eraser' : null;
    e.preventDefault();
    this.target.routeDown(this.toToolPointer(e), override);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerType === 'touch' && this.touches.has(e.pointerId)) {
      this.handleTouchMove(e);
      return;
    }
    const isDown = this.activePointer === e.pointerId;
    if (this.activePointer !== null && !isDown) return;
    this.target.routeMove(this.toToolPointer(e), isDown);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.touches.delete(e.pointerId)) {
      this.pinch = null;
      if (this.activePointer !== e.pointerId) return;
    }
    if (this.activePointer !== e.pointerId) return;
    this.activePointer = null;
    if (e.pointerType === 'pen') this.penActive = false;
    this.target.routeUp(this.toToolPointer(e));
  };

  private onPointerCancel = (e: PointerEvent): void => {
    this.touches.delete(e.pointerId);
    this.pinch = null;
    if (this.activePointer !== e.pointerId) return;
    this.activePointer = null;
    this.penActive = false;
    this.target.routeCancel();
  };

  private onPointerLeave = (e: PointerEvent): void => {
    if (this.activePointer === null) this.target.routeMove(this.toToolPointer(e), false);
  };

  private onDoubleClick = (e: MouseEvent): void => {
    this.target.routeDoubleClick(this.toToolPointer(e));
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const camera = this.target.camera;
    const sx = e.clientX - this.rect.left;
    const sy = e.clientY - this.rect.top;
    const deltaY = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    const deltaX = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX;
    // ctrlKey también llega en la pinza del trackpad.
    const wantsZoom = e.ctrlKey || e.metaKey || this.target.inputSettings().wheelMode === 'zoom';
    if (wantsZoom) {
      const speed = e.ctrlKey && Math.abs(deltaY) < 50 ? PINCH_ZOOM_SPEED : WHEEL_ZOOM_SPEED;
      camera.zoomAt(sx, sy, camera.zoom * Math.exp(-deltaY * speed));
      return;
    }
    if (e.shiftKey && deltaX === 0) camera.panBy(-deltaY, 0);
    else camera.panBy(-deltaX, -deltaY);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code !== 'Space' || isTyping(e)) return;
    e.preventDefault();
    this.spaceHeld = true;
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') this.spaceHeld = false;
  };

  /**
   * Devuelve true si el toque se consume para navegar. Con el lápiz apoyado se
   * ignoran los toques (rechazo de palma).
   */
  private handleTouchDown(e: PointerEvent): boolean {
    if (this.penActive) return true;
    const navigate = this.target.inputSettings().touchMode === 'navigate';
    this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.capture(e.pointerId);

    if (this.touches.size === 2) {
      // Segundo dedo: cancela lo que hacía el primero y pasa a pinza.
      if (this.activePointer !== null) {
        this.activePointer = null;
        this.target.routeCancel();
      }
      this.pinch = this.pinchState();
      return true;
    }
    if (this.touches.size > 2) return true;
    return navigate;
  }

  private handleTouchMove(e: PointerEvent): void {
    const previous = this.touches.get(e.pointerId);
    if (!previous) return;
    this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const camera = this.target.camera;

    if (this.touches.size >= 2 && this.pinch) {
      const next = this.pinchState();
      if (!next) return;
      camera.panBy(next.center.x - this.pinch.center.x, next.center.y - this.pinch.center.y);
      if (this.pinch.distance > 0) {
        camera.zoomAt(
          next.center.x - this.rect.left,
          next.center.y - this.rect.top,
          camera.zoom * (next.distance / this.pinch.distance),
        );
      }
      this.pinch = next;
      return;
    }
    if (this.activePointer === e.pointerId) {
      this.target.routeMove(this.toToolPointer(e), true);
      return;
    }
    camera.panBy(e.clientX - previous.x, e.clientY - previous.y);
  }

  /** Captura el puntero para seguir recibiendo eventos fuera del lienzo. */
  private capture(pointerId: number): void {
    try {
      this.surface.setPointerCapture(pointerId);
    } catch {
      // Puntero ya liberado (o sintético): se sigue sin captura.
    }
  }

  private pinchState(): { distance: number; center: Point } | null {
    const [a, b] = [...this.touches.values()];
    if (!a || !b) return null;
    return {
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }

  private toToolPointer(e: PointerEvent | MouseEvent): ToolPointer {
    const camera = this.target.camera;
    const left = this.rect.left;
    const top = this.rect.top;
    const isPointer = 'pointerType' in e;
    const hasPressure = isPointer && e.pointerType === 'pen';
    const events: (PointerEvent | MouseEvent)[] =
      isPointer && typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    if (events.length === 0) events.push(e);
    const samples: PointerSample[] = events.map((ev) => {
      const world = camera.screenToWorld(ev.clientX - left, ev.clientY - top);
      const pressure = 'pressure' in ev && hasPressure ? (ev as PointerEvent).pressure : 0.5;
      return { x: world.x, y: world.y, pressure };
    });
    const screen = { x: e.clientX - left, y: e.clientY - top };
    return {
      world: camera.screenToWorld(screen.x, screen.y),
      screen,
      samples,
      hasPressure,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey || e.metaKey,
    };
  }
}

function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}
