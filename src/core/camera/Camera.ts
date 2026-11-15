import { boundsHeight, boundsWidth, isEmpty, type Bounds } from '../math/bounds';
import type { Point } from '../math/vec';
import { Emitter } from '../util/emitter';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
const ZOOM_STEPS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3, 4, 6, 8];

export interface CameraState {
  /** Punto del mundo que queda en la esquina superior izquierda. */
  x: number;
  y: number;
  zoom: number;
}

type CameraEvents = { change: CameraState };

/** Qué parte de la pizarra se ve: pantalla = (mundo − origen) × zoom. */
export class Camera {
  private state: CameraState = { x: 0, y: 0, zoom: 1 };
  private viewport = { width: 0, height: 0 };
  private readonly events = new Emitter<CameraEvents>();

  get x(): number {
    return this.state.x;
  }
  get y(): number {
    return this.state.y;
  }
  get zoom(): number {
    return this.state.zoom;
  }
  get snapshot(): CameraState {
    return { ...this.state };
  }

  onChange(listener: (state: CameraState) => void): () => void {
    return this.events.on('change', listener);
  }

  setViewport(width: number, height: number): void {
    this.viewport = { width, height };
  }

  screenToWorld(sx: number, sy: number): Point {
    return { x: sx / this.state.zoom + this.state.x, y: sy / this.state.zoom + this.state.y };
  }

  worldToScreen(wx: number, wy: number): Point {
    return { x: (wx - this.state.x) * this.state.zoom, y: (wy - this.state.y) * this.state.zoom };
  }

  /** Región del mundo visible ahora. */
  visibleBounds(): Bounds {
    const { x, y, zoom } = this.state;
    return {
      minX: x,
      minY: y,
      maxX: x + this.viewport.width / zoom,
      maxY: y + this.viewport.height / zoom,
    };
  }

  set(state: CameraState): void {
    this.state = { ...state, zoom: clampZoom(state.zoom) };
    this.events.emit('change', this.snapshot);
  }

  panBy(dxScreen: number, dyScreen: number): void {
    const { x, y, zoom } = this.state;
    this.set({ x: x - dxScreen / zoom, y: y - dyScreen / zoom, zoom });
  }

  /** Cambia el zoom manteniendo fijo el punto de pantalla indicado. */
  zoomAt(sx: number, sy: number, nextZoom: number): void {
    const zoom = clampZoom(nextZoom);
    const anchor = this.screenToWorld(sx, sy);
    this.set({ x: anchor.x - sx / zoom, y: anchor.y - sy / zoom, zoom });
  }

  zoomAtCenter(nextZoom: number): void {
    this.zoomAt(this.viewport.width / 2, this.viewport.height / 2, nextZoom);
  }

  zoomIn(): void {
    const next = ZOOM_STEPS.find((step) => step > this.state.zoom + 1e-3) ?? MAX_ZOOM;
    this.zoomAtCenter(next);
  }

  zoomOut(): void {
    const next = [...ZOOM_STEPS].reverse().find((step) => step < this.state.zoom - 1e-3) ?? MIN_ZOOM;
    this.zoomAtCenter(next);
  }

  /** Encuadra los límites dados con margen; no acerca más de 100%. */
  fit(bounds: Bounds, padding = 64): void {
    if (isEmpty(bounds) || this.viewport.width === 0) {
      this.set({ x: 0, y: 0, zoom: 1 });
      return;
    }
    const zoom = clampZoom(
      Math.min(
        (this.viewport.width - padding * 2) / Math.max(boundsWidth(bounds), 1),
        (this.viewport.height - padding * 2) / Math.max(boundsHeight(bounds), 1),
        1,
      ),
    );
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    this.set({
      x: cx - this.viewport.width / 2 / zoom,
      y: cy - this.viewport.height / 2 / zoom,
      zoom,
    });
  }
}

export const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
