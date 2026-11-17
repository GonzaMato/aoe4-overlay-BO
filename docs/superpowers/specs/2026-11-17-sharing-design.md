# Preparación para compartir — diseño aprobado por alcance

El usuario pidió ejecutar los cinco puntos propuestos: primer inicio, paquete de builds,
diagnóstico, compatibilidad y GitHub Releases. Se implementa sobre Tauri/Svelte existentes.
No se solicita otra aprobación del mismo recorrido; las decisiones de detalle son del implementador.

## Enfoque
Integrar el detector existente en un asistente, en lugar de duplicarlo o activar OCR a ciegas.
Primera instalación abre Inicio: elegir build → abrir partida → detectar → comparar cinco contadores
→ confirmar. Se puede omitir y volver desde Inicio. Bibliotecas anteriores conservan configuración.
Mientras se calibra el OCR no avanza el build ni inicia un registro de práctica; se conservan las
acciones manuales explícitas del usuario. Confirmación requiere una
lectura válida, tres capturas de regiones estables y menos de 60 segundos de antigüedad; Alt+Tab
conserva la última muestra con su edad explícita. Fallos posteriores invalidan esa muestra.

Paquete versionado importable, separado de historial, perfiles y ajustes. El usuario cambió el
alcance durante la ejecución: buscar una apertura por civilización en lugar de sus tres builds.
Son 25 aperturas de fuentes públicas verificadas, con autor atribuido, URL y fecha de revisión.
Los builds nuevos usan IDs públicos estables. Importar el mismo paquete no duplica ni pisa ediciones.

Diagnóstico visible antes de copiar: versión, monitores (dimensiones/escala, sin nombres), disponibilidad
del OCR, enfoque del juego, última muestra numérica y condición actual. Sin nombres de jugador,
historial, rutas personales, contenido completo de builds ni capturas. No se envía automáticamente.

Buscar actualizaciones consulta GitHub únicamente al hacer clic, maneja sin release/red/rate limit,
compara versiones y ofrece un enlace fijo al repositorio público GonzaMato/aoe4-overlay-BO.
Sin descarga ni instalación automática. Preparar release 0.3.0 con instalador, fuente GPLv3,
paquete, guía, notas y hashes. Publicación reproducible con workflow de release en borrador.

## Validación y límites
Pruebas puras de migración/confirmación/importación/privacidad/versionado; check y build frontend;
tests Rust y paquete NSIS. Matriz de Steam/Xbox, 1080p/1440p/4K, DPI y dos monitores con estado
pendiente donde no exista evidencia real. No confundir fixtures escalados con instalaciones reales.

## Presentación
Conservar Barlow/Barlow Condensed y paleta actual (#12151a, #1b2028, #e8ebef, #9aa2ae, #f2b33d).
Inicio usa recorrido de tres etapas y una fila de cinco contadores como elemento principal de
confirmación. Ayuda tiene acciones concretas y diagnóstico expandible; no introducir un dashboard.
