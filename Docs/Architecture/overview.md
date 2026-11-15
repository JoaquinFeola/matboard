# Arquitectura del motor

## Capas
```
UI (Solid)  ──▶  Editor (fachada)  ──▶  Tools ──▶ Commands ──▶ History
                     │                                  │
                     ├──▶ Camera                        ▼
                     └──▶ Renderer ◀──────────────── Scene (Map + rbush)
```
- **Editor** es la única puerta de entrada para la UI: herramienta activa, estilo, selección,
  deshacer/rehacer, eventos de cambio. No conoce Solid; la UI se suscribe.
- **Tools** reciben eventos de puntero en coordenadas de mundo y producen **Commands**.
- **History** guarda comandos (no copias de la escena): `do()` / `undo()`, tope de 200.
- **Scene** guarda elementos en orden de dibujo (`Map` insertado en orden + índice z) y un
  **rbush** con sus límites para recorte y búsquedas.

## Modelo de datos
```ts
type Element = StrokeElement | ShapeElement | TextElement | ImageElement
// Comunes: id, x, y (posición en mundo), z, color, size, angle?
StrokeElement { type:'stroke', variant:'pen'|'pencil'|'highlighter', points: number[] /* x,y,p relativos */, pressure: boolean }
ShapeElement  { type:'shape', shape:'rect'|'ellipse'|'line'|'arrow', w, h }
TextElement   { type:'text', text, fontSize }
ImageElement  { type:'image', assetId, w, h }
// Opcional en todos: angle (radianes, alrededor del centro de su caja local)
```
Los puntos son **relativos a (x, y)**: mover un elemento solo cambia x, y; su `Path2D`
cacheado sigue sirviendo.

## Render
- Dos `<canvas>` superpuestos al tamaño físico de la ventana (`devicePixelRatio`):
  - **estático**: fondo (patrón en coordenadas de mundo) + elementos visibles; se redibuja solo
    cuando cambia la escena o la cámara, agrupado en un `requestAnimationFrame`.
  - **interactivo**: trazo en curso, marco de selección, cursor de la goma; se redibuja cada
    movimiento sin tocar el estático.
- Cada elemento tiene un `Path2D` en coordenadas locales, cacheado por `id` + `version`.

## Archivo de pizarra
Carpeta `%APPDATA%/com.matboard.app/boards/`:
- `<id>.json` → `{ version: 1, meta, elements }`
- `<id>.meta.json` → `{ id, name, background, createdAt, updatedAt, thumbnail }` (para listar
  sin leer los elementos)

- `assets/<hash>.img` → imágenes (WebP, máx. 2048 px), compartidas entre pizarras: el id es
  un hash del contenido, así pegar la misma imagen no la duplica.

Escritura atómica (archivo temporal + renombrar). Coordenadas redondeadas a 2 decimales.
Autoguardado 600 ms después del último cambio y al salir de la pizarra.

## Exportar
PNG (canvas 2x), SVG y PDF vectorial propio (`core/export/pdf.ts`, sin dependencias, se carga
solo al exportar). Los resaltados se pintan antes que el resto (`paintOrder`).

## Memoria
La ventana se crea en Rust (`src-tauri/src/window.rs`) con argumentos de WebView2 que apagan
servicios innecesarios. "Ahorro de memoria" agrega `--disable-gpu` (archivo `low-memory` en la
carpeta de datos, leído antes de crear la ventana).

## Entrada
Pointer Events con `getCoalescedEvents()`. `pointerType === 'pen'` usa presión real. El dedo
navega (pinza/arrastre) salvo que la configuración diga "dibujar con el dedo".
