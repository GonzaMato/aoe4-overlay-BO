# Instalador y subtareas

Solicitud aprobada: instalador estable y pasos mixtos divididos en tareas; sin retomar sesiones.

1. Añadir subtareas opcionales, normalización segura, copia/importación/respaldo y navegación secuencial. Verificar con pruebas de retrocompatibilidad, datos inválidos, transición manual/OCR y finalización.
2. Editor de sugerencias revisables y secuencia editable. Overlay muestra una tarea actual, conserva metadatos del paso y solo termina después de la última tarea. Validar Svelte y UI.
3. Instalador NSIS por usuario en español, identidad estable, accesos directos y versión actualizada. Generar artefacto, comprobar su instalación y persistencia sin modificar builds del usuario.
4. Ejecutar suite, revisión independiente y resolver hallazgos importantes.

Decisiones: trabajar en el checkout existente autorizado; no descartar cambios anteriores ni hacer commits no pedidos. Los builds existentes conservan su comportamiento hasta aplicar subtareas. Las sugerencias separan cláusulas explícitas, mantienen texto y exigen revisión. El historial continúa registrando llegadas al paso padre. El final del build sigue requiriendo confirmación manual.

Interfaces compartidas: tareas -> normalización/editor/cursor/OCR. El cursor invalida lecturas pendientes al avanzar y solo trata como final la última tarea del último paso.

Completado:
- Modelo opcional, validación y copia/importación/respaldo sin cambiar datos antiguos; navegación reversible dentro y entre pasos.
- Borrador editable con aplicación explícita, criterios individuales y visualización de tarea actual. Prueba visual en navegador: casa + campamento + madera, dos manuales y mínimo madera 3, controles editables y aplicación de secuencia.
- 49 pruebas Node aprobadas, svelte-check sin errores ni advertencias, frontend y binario release compilados.
- Revisión independiente (review_installer_subtasks): corregidos tres hallazgos P2 con regresiones: objetivos repetidos se sugieren manuales, importación individual rechaza secuencias inválidas, cursor se conserva por ID al editar/reordenar otros pasos. Sin hallazgos menores pendientes.
- NSIS oficial descargado con hash validado. Instalador final 0.2.0 generado e instalado por usuario, código de salida 0. Accesos Inicio y Escritorio apuntan a AppData/Local/AoE4 Overlay/aoe4-overlay.exe; hash del instalado coincide con release.
- Datos del usuario: 3 builds, SHA256 EACABE016DB074619093DA169CED830C86F3CF8358FA8082CE7BDF47EDDB8617 idéntico antes/después. App instalada muestra los tres builds. Segundo lanzamiento conserva PID 8020 y recupera la vista previa del overlay.

Límites de verificación: juego cerrado; OCR y navegación se validaron con pruebas de lógica, no con una nueva partida. Los atajos PageDown del navegador de prueba no permitieron completar una prueba visual de la secuencia; no se atribuyó ese resultado al funcionamiento nativo. Tauri avisó al reempaquetar el binario ya marcado que no podía volver a agregar bundle-type; no usamos updater automático. Instalador generado e instalación comprobados.
