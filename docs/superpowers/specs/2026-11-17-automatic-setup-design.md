# Setup automático de AoE4 Overlay

Estado: aprobado por el usuario el 2026-11-17. Implementación en curso.

## Experiencia buscada

Con la app abierta, entrar a AoE4 debe preparar el overlay con la menor intervención posible. Un control «Setup automático» habilita el flujo completo. La app muestra un estado breve: «Esperando AoE4», «Buscando contadores», «Listo», o el dato concreto que falta. Los controles manuales actuales permanecen disponibles.

Se conserva el total acordado: comida + madera + oro + piedra + inactivos. El reparto entre recursos puede diferir del build. El contador de población no reemplaza ese total.

## Enfoques

1. **Perfiles con calibración inicial manual.** Es el cambio más acotado, pero conserva el trabajo inicial que el usuario quiere evitar.
2. **Detección visual con perfiles reutilizables y alternativa manual.** Es el enfoque propuesto: buscar y validar los elementos del HUD, recordar el resultado y pedir ayuda únicamente donde la lectura sea ambigua.

El usuario eligió la dirección de automatización completa en la conversación. La elección técnica de detección visual con perfiles es una propuesta del implementador; no una preferencia técnica expresada por el usuario.

## Comportamiento

### Pantalla y posición

- Identificar la ventana de AoE4 por su proceso y obtener el área cliente, monitor, dimensiones y escala. No usar la posición de la ventana de gestión como referencia del juego.
- Ubicar el overlay dentro del área del juego. Conservar una posición personalizada válida para ese perfil; en un perfil nuevo usar la esquina configurada.
- Si cambia la geometría, suspender las lecturas pendientes y resolver el nuevo perfil antes de continuar. Cambiar el monitor o usar Alt+Tab no reinicia una práctica.

### Calibración automática

- Buscar la estructura del panel de recursos y sus contadores, considerando escalas del HUD. Validar la ubicación mediante geometría del panel y lecturas repetidas de los cinco números; no aceptar simplemente cualquier columna de números cuya suma sea menor que 200.
- La detección se realiza sobre la imagen visible del juego, sin leer memoria ni enviar acciones de juego.
- Guardar rectángulos relativos al área cliente. Los perfiles distinguen monitor, tamaño del área cliente y escala. Al recuperar un perfil, volver a validar los contadores antes de habilitar el avance.
- Si la identificación falla o es ambigua, mostrar «No pude ubicar los contadores» y ofrecer los selectores existentes. La corrección manual se guarda en ese perfil.
- Una calibración existente solo se migra a un perfil cuando se verifica contra la geometría y la imagen actuales. No trasladar coordenadas absolutas de otra pantalla sin validación.

### Civilización y build

- Propuesta de alcance: partidas propias. Buscar evidencia de la civilización del jugador local en las pantallas visibles de preparación/carga o en un indicador del HUD que pueda asociarse inequívocamente con él.
- Resolver la identidad del jugador local antes de seleccionar entre varias civilizaciones. No usar la primera civilización encontrada en una pantalla multijugador ni confundir el jugador observado con el local.
- Seleccionar el build predeterminado de la civilización y modo identificados. Si hay varias opciones o no se puede identificar al jugador, mantener el build actual y ofrecer una elección rápida. Recordar la elección; no presentar incertidumbre como detección exitosa.
- La selección automática se realiza al preparar la partida. Un cambio manual de build prevalece durante esa partida.
- La detección del jugador local es una dependencia por verificar con una muestra real de lobby/carga; las capturas disponibles hasta ahora prueban los contadores, no esa identificación.

### Reloj

- Buscar el reloj de partida visible, validar formato y evolución temporal, y sincronizar el reloj del overlay con ese tiempo. No confundir tiempos de construcción o marcas de texto con el reloj de partida.
- Mantener separados el tiempo mostrado, el paso actual y la identidad de la práctica. Corregir la lectura del reloj no vuelve al paso 1 ni reescribe las llegadas anteriores.
- Si se abre a mitad de partida, sincronizar el tiempo sin afirmar que la práctica comenzó en 0:00. La selección del paso continúa bajo los controles ya existentes.
- No interpretar una lectura aislada de 0:00 o una pérdida de foco como una nueva partida. Un reinicio exige una transición de partida confirmada; ante ambigüedad se conserva la sesión.
- Si el reloj no está visible o es ilegible, indicar el estado y conservar el control manual. Una pérdida temporal de lectura no inventa tiempos ni activa saltos de paso.
- Las acciones manuales de pausar, reiniciar o ajustar el reloj suspenden la sincronización automática para esa partida. Terminar la práctica también bloquea el reinicio automático de esa misma sesión. Un control explícito «Volver al reloj del juego» o una nueva partida confirmada restaura la sincronización. Esta prioridad manual es una decisión propuesta del implementador para que la siguiente lectura no deshaga la acción del usuario.

## Límites y decisiones pendientes de evidencia

- Mantener Tauri/Rust, Svelte y OCR local de Windows. No agregar servicios externos ni depender de un catálogo remoto para seleccionar builds.
- La detección visual debe probarse con capturas reales del HUD y distintas geometrías antes de presentarse como compatible con ellas. No prometer reconocimiento universal de civilizaciones o escalas sin evidencia.
- No modificar preferencias del juego, iniciar Windows con la app, instalar servicios ni lanzar AoE4: no forman parte de lo conversado.
- No detener la instancia del usuario para las pruebas. Usar un identificador y datos aislados; entregar un ejecutable actualizado.

## Criterios de aceptación

1. Entrar al juego prepara pantalla y regiones sin seleccionar coordenadas cuando el HUD es reconocible.
2. Mover el juego o volver a una resolución conocida recupera el perfil correcto, tras validación.
3. Una lectura dudosa no reemplaza la calibración, no cambia el build y no reinicia la práctica.
4. La civilización local identificada carga su predeterminado; las identidades ambiguas se muestran como pendientes.
5. El reloj visible sincroniza el overlay sin requerir inicio manual y sin perder el paso actual.
6. La selección manual sigue funcionando y mejora el perfil guardado.
7. Respaldos y datos existentes conservan builds, ajustes y prácticas.

## Revisión de viabilidad del diseño

La revisión independiente señaló una ambigüedad sobre la prioridad de los controles manuales del reloj. Se resolvió arriba: las acciones manuales prevalecen durante la partida hasta volver explícitamente al reloj del juego o detectar una partida nueva. Las fuentes visuales para identificar al jugador local y distinguir el reloj siguen siendo dependencias de evidencia, no capacidades verificadas.
