/** Fuente de imágenes ya decodificadas para pintar de forma sincrónica. */
export interface ImageSource {
  /** La imagen si ya está lista; si no, la empieza a cargar y devuelve null. */
  get(assetId: string): CanvasImageSource | null;
}

export type AssetLoader = (assetId: string) => Promise<Blob>;

/**
 * Decodifica cada imagen una sola vez (ImageBitmap) y avisa cuando una nueva
 * queda lista para redibujar. `dispose` libera la memoria de los bitmaps.
 */
export class ImageCache implements ImageSource {
  private readonly bitmaps = new Map<string, ImageBitmap>();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly failed = new Set<string>();
  private listener: (() => void) | null = null;

  constructor(private readonly loader: AssetLoader) {}

  onLoaded(listener: () => void): void {
    this.listener = listener;
  }

  get(assetId: string): ImageBitmap | null {
    const bitmap = this.bitmaps.get(assetId);
    if (bitmap) return bitmap;
    void this.load(assetId);
    return null;
  }

  /** Espera a que estén decodificadas (antes de exportar). */
  async ensure(assetIds: Iterable<string>): Promise<void> {
    await Promise.all([...new Set(assetIds)].map((id) => this.load(id)));
  }

  /** Registra una imagen recién importada para no volver a leerla del disco. */
  put(assetId: string, bitmap: ImageBitmap): void {
    this.bitmaps.get(assetId)?.close();
    this.bitmaps.set(assetId, bitmap);
  }

  dispose(): void {
    this.bitmaps.forEach((bitmap) => bitmap.close());
    this.bitmaps.clear();
    this.pending.clear();
    this.listener = null;
  }

  private load(assetId: string): Promise<void> {
    if (this.bitmaps.has(assetId) || this.failed.has(assetId)) return Promise.resolve();
    const existing = this.pending.get(assetId);
    if (existing) return existing;
    const task = this.loader(assetId)
      .then((blob) => createImageBitmap(blob))
      .then((bitmap) => {
        this.bitmaps.set(assetId, bitmap);
        this.listener?.();
      })
      .catch(() => {
        this.failed.add(assetId);
      })
      .finally(() => this.pending.delete(assetId));
    this.pending.set(assetId, task);
    return task;
  }
}
