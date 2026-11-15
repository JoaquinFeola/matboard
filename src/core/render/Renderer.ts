import type { Camera } from '../camera/Camera';
import { expand } from '../math/bounds';
import type { BackgroundKind } from '../model/board';
import type { Scene } from '../scene/Scene';
import { paintBackground } from './background';
import { paintElement, paintOrder } from './painter';
import type { ImageSource } from './imageCache';
import type { CanvasTheme } from './theme';

export interface RendererSource {
  scene: Scene;
  camera: Camera;
  background(): BackgroundKind;
  theme(): CanvasTheme;
  images: ImageSource;
  /** Elemento que no se dibuja (p. ej. el texto que se está editando). */
  hidden(): string | null;
  /** Pinta lo efímero (trazo en curso, selección) con el contexto ya en coordenadas de mundo. */
  paintOverlay(ctx: CanvasRenderingContext2D): void;
}

/**
 * Dos capas: la estática (fondo + elementos) se redibuja solo cuando cambia la
 * escena o la cámara; la interactiva, en cada movimiento del puntero. Ambas se
 * agrupan en un único `requestAnimationFrame`.
 */
export class Renderer {
  private readonly staticCtx: CanvasRenderingContext2D;
  private readonly overlayCtx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private staticDirty = true;
  private overlayDirty = true;
  private frame = 0;

  constructor(
    private readonly staticCanvas: HTMLCanvasElement,
    private readonly overlayCanvas: HTMLCanvasElement,
    private readonly source: RendererSource,
  ) {
    this.staticCtx = get2d(staticCanvas, false);
    this.overlayCtx = get2d(overlayCanvas, true);
  }

  /** Ajusta los canvas a la resolución física para que nada se vea borroso. */
  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.width = cssWidth;
    this.height = cssHeight;
    this.dpr = dpr;
    for (const canvas of [this.staticCanvas, this.overlayCanvas]) {
      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
    }
    this.source.camera.setViewport(cssWidth, cssHeight);
    this.invalidateAll();
  }

  invalidateStatic(): void {
    this.staticDirty = true;
    this.schedule();
  }

  invalidateOverlay(): void {
    this.overlayDirty = true;
    this.schedule();
  }

  invalidateAll(): void {
    this.staticDirty = true;
    this.overlayDirty = true;
    this.schedule();
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private schedule(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.staticDirty) this.paintStatic();
      if (this.overlayDirty) this.paintOverlay();
    });
  }

  private applyWorldTransform(ctx: CanvasRenderingContext2D): void {
    const { camera } = this.source;
    const scale = camera.zoom * this.dpr;
    ctx.setTransform(scale, 0, 0, scale, -camera.x * scale, -camera.y * scale);
  }

  private paintStatic(): void {
    this.staticDirty = false;
    const ctx = this.staticCtx;
    const { camera, scene } = this.source;
    const theme = this.source.theme();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    paintBackground(
      ctx,
      this.source.background(),
      {
        x: camera.x,
        y: camera.y,
        zoom: camera.zoom,
        width: this.staticCanvas.width,
        height: this.staticCanvas.height,
        dpr: this.dpr,
      },
      theme,
    );
    this.applyWorldTransform(ctx);
    const visible = expand(camera.visibleBounds(), 2 / camera.zoom);
    const hidden = this.source.hidden();
    for (const element of paintOrder(scene.query(visible))) {
      if (element.id !== hidden) paintElement(ctx, element, theme, this.source.images);
    }
  }

  private paintOverlay(): void {
    this.overlayDirty = false;
    const ctx = this.overlayCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.applyWorldTransform(ctx);
    this.source.paintOverlay(ctx);
  }

  get viewportSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}

function get2d(canvas: HTMLCanvasElement, transparent: boolean): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { alpha: transparent });
  if (!ctx) throw new Error('Canvas 2D no disponible');
  return ctx;
}
