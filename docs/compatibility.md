# Matriz de compatibilidad de la beta 0.3.0

No se marca una combinación como compatible por haber compilado o escalado una imagen.

| Entorno | Evidencia | Estado |
| --- | --- | --- |
| Contadores reales: comida/madera/oro/piedra/inactivos | Fixtures OCR en Windows, pruebas automatizadas | Verificado en capturas |
| Reloj inicial y avanzado | Fixtures OCR en Windows | Verificado en capturas |
| Detector a 80/100/125/150% | Imágenes escaladas sintéticamente | Verificado en pruebas, no en monitores reales |
| Instalación Windows limpia sin Node/Rust | Requiere VM o PC de beta | Pendiente |
| Steam, 1920×1080, 100% | Requiere partida real | Pendiente |
| Steam, 2560×1440, 100/125% | Requiere partida real con esta versión | Pendiente |
| Xbox/Game Pass, 1920×1080 | Requiere instalación y partida real | Pendiente |
| Steam/Xbox, 3840×2160, 150/200% | Requiere pantalla/partida real | Pendiente |
| Dos monitores, DPI distintos, origen negativo | Prueba de coordenadas + prueba real pendiente | Parcial |
| Actualizar 0.2.0 → 0.3.0 en Windows del desarrollador | Instalador ejecutado, tres builds e historial conservados; nueva biblioteca de 28 builds | Verificado |
| Diagnóstico y consulta GitHub en app instalada | OCR en-US disponible, monitores 2560×1440 y 1920×1080 al 100%, respuesta sin releases | Verificado |
| Inicio de instancia única tras actualización | Reabrir conserva una gestión y un overlay | Verificado |
| 25 builds iniciales | Secuencia adaptada de fuentes, criterios conservadores | Sin playthrough completo |

## Protocolo para cada persona de la beta

1. Anotar versión de app, Windows, tienda (Steam/Xbox), resolución, escala y cantidad de monitores.
2. Instalar con usuario sin builds previos. Comprobar Inicio y disponibilidad del OCR.
3. Elegir build y entrar a una práctica. Comparar los cinco contadores, incluidos ceros/inactivos.
4. Confirmar; verificar un paso de aldeanos y uno de construcción manual. Pausar/reanudar reloj.
5. Alt+Tab: el overlay desaparece y AvPág/RePág vuelven a funcionar en otras apps.
6. Mover el overlay al segundo monitor; cambiar resolución/DPI y recalibrar si hace falta.
7. Exportar respaldo, cerrar con Salir, instalar de nuevo y verificar datos conservados.
8. Completar el build, confirmar celebración y ocultación. Abrir dos veces: una sola instancia.
9. Adjuntar diagnóstico revisado. Una captura es opcional; no incluir datos personales innecesarios.

Registrar fecha, resultado real y pasos para reproducir. Una casilla pendiente sigue pendiente hasta
que alguien pruebe esa combinación. No se ejecutan partidas ni cambios de monitor del usuario sin necesidad.
