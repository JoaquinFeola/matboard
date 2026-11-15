# Matboard

Pizarra de estudio para Windows: pluma y lápiz con presión, formas, texto, fondos de cuaderno,
y todo guardado en tu computadora.

## Requisitos
- Node 20+ y npm
- Rust (stable) y las Build Tools de Visual Studio (C++)
- WebView2 (viene con Windows 11)

## Comandos
| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias |
| `npm run tauri dev` | Abre la app de escritorio en modo desarrollo |
| `npm run dev` | Solo la interfaz en el navegador (guarda en `localStorage`) |
| `npm test` | Tests del motor |
| `npm run typecheck` | Chequeo de tipos |
| `npm run tauri build` | Instaladores en `src-tauri/target/release/bundle/` |

## Dónde se guardan las pizarras
`%APPDATA%\com.matboard.app\boards\` — un `<id>.json` (contenido) y un `<id>.meta.json`
(nombre, fondo, fechas, miniatura) por pizarra. Las imágenes van en `boards\assets\`.

## Estructura
```
src/
  core/        motor sin UI: modelo, escena (rbush), cámara, render, herramientas, historial, exportación
  storage/     repositorio de pizarras (Tauri o navegador) y guardado de archivos
  features/    pantallas: boards (inicio), editor (lienzo, barras), settings
  ui/          componentes reutilizables (botones, popover, diálogo, toast)
  state/       configuración de la app
src-tauri/     comandos Rust: listar/cargar/guardar/borrar pizarras, guardar exportaciones
Docs/          producto, features, glosario y arquitectura
```
Más detalle en [Docs/Architecture/overview.md](Docs/Architecture/overview.md).
