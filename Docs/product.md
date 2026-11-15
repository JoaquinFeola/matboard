# Matboard — Producto

## Propósito
Pizarra digital para **estudiar**: tomar apuntes a mano, resolver ejercicios y hacer esquemas
sobre una hoja infinita con fondo de cuadernillo (cuadriculado o rayado). Todo queda guardado
en la computadora, sin cuenta ni internet.

## Usuario
Estudiante que escribe con **lápiz digital con presión** en una laptop/tablet Windows, y a veces
con mouse. Quiere abrir, escribir y que se vea bien; no quiere configurar nada para empezar.

## Entrega 1 (versión funcional)
- Pizarras locales: crear en un clic (o `Ctrl+N`), abrir, renombrar, borrar; autoguardado.
- Herramientas: pluma, lápiz, goma de trazo completo, selección, mano, formas (rectángulo,
  elipse, línea, flecha), texto.
- Colores y grosores; barra de herramientas flotante que se puede mover.
- Historial: `Ctrl+Z`, `Ctrl+Y` / `Ctrl+Shift+Z`.
- Selección: mover, borrar con `Supr`/`Backspace`, `Ctrl+A`.
- Navegación: mano, espacio+arrastrar, zoom in/out (rueda, pinza, botones, `Ctrl +/-/0`).
- Fondo por pizarra: cuadriculado, rayado, puntos o liso.
- Configuración: tema claro/oscuro/sistema, comportamiento de la rueda, dibujar con el dedo.
- Exportar a PNG y SVG.

## Fuera de alcance (entrega 1)
macOS, Linux, Android; PDF; colaboración; nube; capas; imágenes pegadas; redimensionar con
manijas.

## Metas de calidad
| Meta | Cómo se mide |
|---|---|
| Poca RAM | Proceso de la app + WebView2 en reposo con una pizarra abierta; objetivo < 150 MB *(objetivo, a medir)* |
| Trazos nítidos | Canvas a resolución física (`devicePixelRatio`); sin pixelado en ningún zoom |
| Fluidez | Dibujar sin saltos con eventos agrupados (`getCoalescedEvents`); 60 fps al mover la vista |
| Simple | Crear y empezar a escribir: 1 clic desde el inicio |
