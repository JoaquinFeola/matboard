# ADR-001 · Stack: Tauri 2 + SolidJS + Canvas 2D

**Estado:** aceptada (2026-11-15) · **Decide:** el usuario, a propuesta del agente.

## Contexto
App de escritorio para Windows con prioridad en poca RAM, trazos nítidos y fluidez con lápiz
digital. Android quedó como posibilidad lejana.

## Opciones evaluadas
| Opción | RAM escritorio | Lápiz en Android | Motivo |
|---|---|---|---|
| **Tauri 2 (web)** | Baja: usa WebView2 del sistema | Débil (WebView) | Elegida: escritorio es lo principal |
| Electron | Alta: incluye Chromium | — | Descartada por RAM |
| Kotlin + Compose MP | Alta: JVM | La mejor | Descartada: RAM en escritorio |
| Flutter | Media | Muy buena | No elegida: el usuario prefirió Tauri |

## Decisión
- Tauri 2 en Windows (WebView2, Chromium): mejor rendimiento de canvas de las plataformas Tauri.
- SolidJS para la UI: reactividad fina sin DOM virtual, JSX como React.
- Canvas 2D (no SVG/DOM) para la escena, con `Path2D` cacheado por elemento y rbush para
  recorte por vista y búsquedas de la goma/selección.
- Tailwind 4 para un sistema visual escalable con tokens de tema en CSS.

## Consecuencias
- El motor (`src/core`) no depende de Solid: se puede reutilizar si se cambia de UI.
- Sumar macOS es configuración; Linux (WebKitGTK) necesitará medir rendimiento.
- Android con Tauri sería posible pero con peor latencia de lápiz.
