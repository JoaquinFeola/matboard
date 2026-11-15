# Tecnología

Versiones verificadas en el registro de npm / crates el 2026-11-15.

| Componente | Tecnología | Versión | Packs |
|---|---|---|---|
| Shell de escritorio | Tauri (Rust) | 2.x (CLI 2.12) | code |
| Frontend | TypeScript + Vite | TS 6.0, Vite 8 | code, frontend |
| UI | SolidJS | 1.9 | frontend |
| Estilos | Tailwind CSS (plugin Vite) | 4.3 | frontend |
| Íconos | lucide-solid | 1.x | — |
| Trazos | perfect-freehand | 1.2.3 | — |
| Índice espacial | rbush | 4.0 | — |
| Tests | Vitest | 5.x | code |

TypeScript 7 (compilador nativo) ya salió; se usa 6.0 hasta que el ecosistema (plugins de
Vite/Solid) lo declare compatible.

## Estructura
```
src/
  core/        motor sin dependencias de UI (modelo, escena, cámara, render, herramientas, historial)
  storage/     repositorio de pizarras (Tauri o navegador)
  features/    pantallas: boards (inicio) y editor
  ui/          componentes reutilizables (botones, menús, diálogos)
  state/       configuración de la app (signals de Solid)
src-tauri/     comandos Rust: listar, cargar, guardar, borrar pizarras; guardar archivo exportado
```

Ver [ADR-001](ADR-001-stack.md) y [overview.md](overview.md).
