# Deuda técnica y faltantes conocidos

| Id | Qué | Por qué importa | Propuesta |
|---|---|---|---|
| TD-01 | RAM en reposo: 179 MB privados por defecto (meta < 150 MB); 101 MB con "Ahorro de memoria" (sin GPU). Medido 2026-11-15, build release, 3 corridas | Por defecto la meta sigue sin cumplirse; sin GPU el zoom con 2000 trazos baja a ~40 fps en el p95 | Opción en Configuración (hecha). Siguiente paso posible: caché de mosaicos para que sin GPU sea fluido |
| TD-02 | Sin manijas para redimensionar o rotar elementos | Solo se puede mover | Manijas en la selección (comando `UpdateElements`) |
| TD-03 | Sin tests de herramientas ni del Editor (solo del núcleo puro) | Regresiones en selección/goma pasarían desapercibidas | Tests con canvas simulado o e2e con Playwright en el repo |
| TD-04 | La capa estática redibuja todo lo visible al mover la vista | Con miles de trazos visibles puede bajar de 60 fps (sin medir) | Medir; si hace falta, caché en mosaicos (bitmaps) |
| TD-05 | Renombrar desde el inicio relee la pizarra completa | Lento con pizarras enormes | Comando Rust que solo reescriba el `.meta.json` |
| TD-06 | Sin copiar/pegar ni duplicar elementos | Pedido habitual en pizarras | Portapapeles interno con `Ctrl+C/V/D` |
