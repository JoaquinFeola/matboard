# Glosario

| Término | Significado | En el código |
|---|---|---|
| Pizarra | Un documento: nombre, fondo y elementos | `Board` |
| Elemento | Todo lo que hay en una pizarra: trazo, forma o texto | `Element` |
| Trazo | Lo que deja la pluma o el lápiz: una lista de puntos con presión | `StrokeElement` |
| Pluma | Herramienta de trazo con grosor que varía mucho con la presión | `PenTool` (`variant: 'pen'`) |
| Lápiz | Herramienta de trazo fino y parejo, levemente translúcido | `PenTool` (`variant: 'pencil'`) |
| Goma | Borra elementos completos al tocarlos | `EraserTool` |
| Forma | Rectángulo, elipse, línea o flecha | `ShapeElement` |
| Fondo | Patrón de la hoja: cuadriculado, rayado, puntos o liso | `BackgroundKind` |
| Escena | Los elementos de la pizarra abierta y su índice espacial | `Scene` |
| Cámara | Qué parte de la pizarra se ve y con qué zoom | `Camera` |
| Mundo / pantalla | Coordenadas de la pizarra / píxeles de la ventana | `world`, `screen` |
| Herramienta | Lo que interpreta el puntero (dibujar, borrar, seleccionar…) | `Tool` |
| Comando | Una operación que se puede deshacer | `Command` |
