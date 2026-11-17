# AoE4 Overlay

Overlay de build orders para Age of Empires IV. Muestra un paso a la vez arriba del juego,
avanza con teclas globales y guarda tus builds por civilización, modo y mapa.

Hecho con Tauri 2 (Rust) + SvelteKit (Svelte 5, TypeScript).

## Licencia

Copyright (C) 2026 Gonzalo.

AoE4 Overlay se distribuye bajo la **GNU General Public License, versión 3 únicamente**
(`GPL-3.0-only`). El texto completo está en [LICENSE](LICENSE).
Podés usar, modificar y redistribuir el programa conforme a esa licencia.
Se proporciona sin garantía, en los términos de la GPLv3.

Al distribuir el instalador, proporcioná también el código fuente correspondiente a esa
versión, incluidos los archivos y scripts necesarios para compilarlo, conforme a la GPLv3.
Una forma práctica es publicar el instalador y el archivo del código fuente de la misma
versión juntos en cada release. Las versiones derivadas que se distribuyan deben cumplir
la GPLv3; las modificaciones de uso privado no requieren publicación.

Las dependencias y los recursos de terceros conservan sus propias licencias y avisos.
Esta licencia no concede derechos sobre las marcas ni los recursos de Age of Empires.

## Instalar en Windows

Descargas: [GitHub Releases](https://github.com/GonzaMato/aoe4-overlay-BO/releases).
Guía rápida: [empezar en un minuto](docs/quick-start.md).

Ejecutá `AoE4 Overlay_0.3.0_x64-setup.exe` de `src-tauri/target/release/bundle/nsis/`.
El asistente está en español e instala para tu usuario. Usá el acceso directo de **AoE4 Overlay**
en Inicio o en el escritorio. No necesitás Node, Rust ni Visual Studio para usar la app instalada.
Si ya está abierta, ese mismo acceso recupera el overlay existente.

Las actualizaciones se instalan sobre la misma aplicación y conservan builds, ajustes e historial
en `%APPDATA%/com.gonzalo.aoe4-overlay/aoe4-overlay.json`. Cerrá con **Salir de la app** antes
de actualizar. No hay actualización automática ni inicio automático con Windows.
`iniciar.bat` abre primero la versión instalada; `iniciar.bat rebuild` y `dev` siguen usando el proyecto.

## Requisitos para desarrollar (Windows)

1. **Node.js** 24 o superior.
2. **Rust** (instalador `rustup`, toolchain MSVC).
3. **Microsoft C++ Build Tools** con la carga "Desarrollo para el escritorio con C++".
4. **WebView2**: ya viene con Windows 10/11 actualizados.

Guía oficial paso a paso: https://v2.tauri.app/start/prerequisites/

## Cómo correrlo

```
npm install
npm run tauri dev
```

La primera compilación de Rust tarda varios minutos; las siguientes son rápidas.
Se abren dos ventanas: la de gestión (builds y ajustes) y el overlay.

Para generar el instalador:

```
npm run installer
```

Queda en `src-tauri/target/release/bundle/nsis/`. La identidad de la app se mantiene entre versiones.

### Probar la interfaz sin Rust

```
npm run dev
```

Abrí `http://localhost:1420` (gestión) y `http://localhost:1420/overlay` (panel) en dos pestañas.
En este modo los datos se guardan en el navegador y las teclas solo funcionan con la pestaña
del overlay en foco. Sirve para ver y ajustar el diseño, no para jugar.

## Uso

### Subtareas para instrucciones mixtas

En el editor, **Separar en subtareas…** prepara un borrador a partir de las cláusulas de la acción
y la nota. Revisá el orden, editá el texto y abrí **Avance de tarea** para corregir su criterio;
después elegí **Aplicar subtareas**. Los builds existentes no se modifican automáticamente.
Por ejemplo, `Casa + 3 aldeanos a madera` se puede convertir en `Casa` (manual) y
`3 aldeanos a madera` (mínimo de madera tomado del reparto final del paso).

El overlay muestra una tarea actual y su posición dentro del paso. AvPág confirma la tarea manual;
el OCR avanza al cumplir tres lecturas de su objetivo. RePág vuelve a la tarea anterior.
Construcciones y subidas de edad quedan manuales en la sugerencia. Las condiciones y las notas
ambiguas también necesitan revisión; la separación no interpreta automáticamente todos los textos.
El reparto de recursos y el tiempo objetivo siguen perteneciendo al paso completo; los criterios
de cada subtarea se pueden ajustar por separado. El historial registra la primera llegada al paso.

La celebración y el cierre del overlay ocurren al confirmar la última tarea del último paso.
**Volver a paso único** restaura la instrucción y el criterio originales. Las subtareas se incluyen
en clones, JSON exportados y respaldos completos.

### Durante la partida

- **El juego tiene que estar en "ventana sin bordes"**. En pantalla completa exclusiva el overlay queda tapado.
- Los clics atraviesan el overlay: todo se maneja con teclas.
- En la ventana de gestión elegís civilización y modo; si esa combinación tiene un build
  predeterminado, se carga solo en el overlay.
- **Salir de la app**, arriba a la derecha, guarda los cambios y cierra todo. La X de la ventana la oculta y deja la app en la bandeja. Desde el ícono podés abrirla, mover el overlay o salir.
- **Una sola instancia:** ejecutar de nuevo el programa recupera el overlay existente, sin reiniciar el paso ni el reloj. Fuera del juego abre la gestión y una vista previa que podés ocultar; al volver a AoE4 recupera la visibilidad automática.
- **Ajustes por categorías:** Setup automático, Overlay, Atajos, Avance automático, Listas y Respaldo. Los cambios se aplican automáticamente; la ubicación por píxeles está dentro de «Ubicación precisa por esquina y márgenes».
- El overlay se oculta y libera las teclas al salir de AoE4. El modo edición permite ubicarlo también fuera del juego.

### Teclas por defecto (se cambian en Ajustes)

| Acción | Tecla |
| --- | --- |
| Paso siguiente | AvPág |
| Paso anterior | RePág |
| Iniciar / reanudar reloj, conservando el paso | Ctrl + Alt + S |
| Nueva práctica (paso 1 y reloj en cero) | Ctrl + Alt + R |
| Pausar / reanudar reloj | Ctrl + Alt + P |
| Corregir reloj +5 / −5 segundos | Ctrl + Alt + → / ← |
| Terminar práctica | Ctrl + Alt + F |
| Activar / terminar modo edición | Ctrl + Alt + E |
| Mostrar / ocultar overlay | Ctrl + Alt + H |
| Modo compacto | Ctrl + Alt + C |
| Cambiar de build (misma civilización) | Ctrl + Alt + B |

Las combinaciones se reservan solo con AoE4 en primer plano. Si una no se pudo registrar, Ajustes lo avisa.
El reloj manual conserva su marcha al cambiar de aplicación; pausalo si pausás la partida. El reloj sincronizado espera una nueva lectura del juego.

### Builds

- Cada paso tiene población de referencia, tiempo objetivo (opcional), acción, nota y el reparto
  de aldeanos al que hay que llegar. El overlay resalta solo lo que cambia respecto del paso anterior.
- "Clonar" copia un build para editar solo lo distinto.
- "Copiar JSON" / "Importar" sirven para respaldar o compartir builds.
- También podés pegar el JSON de **aoe4guides → Overlay Tool**. Se convierten tiempos, recursos y notas; los iconos quedan como texto. La población desconocida (-1) queda vacía: no se confunde cantidad de aldeanos con población total. Revisá modo y población después de importar.
- Con el build en uso, el número de cada paso en el editor lo muestra en el overlay.
- Una instalación nueva incluye 25 aperturas, una por civilización, con fuente y atribución.
  [Fuentes y límites de la revisión](docs/build-pack-sources.md). Tus builds existentes se conservan:
  añadí el paquete desde Inicio o importá `static/builds/starter-pack.json`. No incluye historial ni calibración.

### Primer inicio y diagnóstico

**Inicio** guía la elección del build, detección de HUD y confirmación de los cinco contadores.
Mientras se calibra, el OCR no avanza instrucciones ni inicia una práctica automáticamente.
Volvé al juego para obtener tres capturas válidas; usá Alt+Tab y confirmá en menos de un minuto.
Si los números no coinciden, reintentá o corregí las regiones. **Usar sin OCR** conserva control manual.
Instalaciones anteriores no cambian su configuración automáticamente; el recorrido queda en Inicio.

**Ayuda** permite preparar/revisar/copiar diagnóstico y buscar versiones. El diagnóstico contiene
versión, resoluciones, escalas, idiomas OCR y última lectura; no incluye nombres de jugador,
historial, rutas ni capturas. Nada se envía automáticamente. La consulta de versiones usa la API
pública de GitHub solo al pulsar **Buscar actualizaciones**; la instalación es manual.

### Publicar una versión

`npm run installer` y `npm run release:package` generan los archivos en `release/0.3.0/`:
instalador, código fuente correspondiente, GPLv3, paquete de builds, guía, notas y hashes SHA-256.
El código fuente se prepara con una lista explícita de carpetas, sin datos de AppData ni secretos.
El workflow `.github/workflows/release.yml` verifica y construye en Windows; un tag `v0.3.0`
crea una release en borrador con los archivos. Revisá los adjuntos y publicala en GitHub.
Un lanzamiento manual del workflow solo genera artefactos, sin publicar una release.
La [matriz de compatibilidad](docs/compatibility.md) diferencia pruebas ejecutadas de casos pendientes.

Los datos se guardan en `aoe4-overlay.json` dentro de la carpeta de datos de la app
(en Windows, normalmente `%APPDATA%\com.gonzalo.aoe4-overlay`).

## Estructura

```
src/
  lib/
    types.ts        modelo de datos (build, paso, ajustes)
    defaults.ts     ajustes y builds iniciales, normalización de datos guardados
    bridge.ts       todo lo que toca a Tauri: guardado, mensajes entre ventanas, ventana, teclas
    hotkeys.ts      formato y captura de combinaciones
    steps.ts        cálculo de cambios entre pasos
    components/     Panel, Compact (overlay) y el editor/ajustes (gestión)
  routes/
    +page.svelte          ventana de gestión
    overlay/+page.svelte  ventana del overlay
src-tauri/
  tauri.conf.json         las dos ventanas (la del overlay: transparente, siempre arriba, sin foco)
  capabilities/           permisos del frontend
  src/lib.rs              plugins y cierre de la app
```

## Posición, respaldo y práctica

En Ajustes, **Mover overlay** activa una barra para arrastrarlo a cualquier monitor. **Listo** guarda la posición y vuelve a dejar pasar los clics. También podés elegir monitor o volver al modo de esquina y márgenes. Si desconectás un monitor, la posición se ajusta a una pantalla disponible.

**Ajustes → Respaldo** exporta builds, preferencias e historial en un JSON. Importar valida y muestra el contenido antes de reemplazar los datos actuales; no mezcla bibliotecas. Los datos guardados por la versión anterior se completan automáticamente con los nuevos ajustes.

**Práctica** permite iniciar el reloj sin cambiar el paso, pausarlo, corregirlo de a 5 segundos y terminar. Se registra la primera llegada a cada paso; volver atrás no pisa ese tiempo. Las correcciones del reloj también se aplican al registro. El resumen compara llegada y objetivo, y conserva el texto y tiempo objetivo aunque después edites el build. AvPág desde el último paso también termina la práctica. Elegir otro build termina la sesión anterior; cambiar con el atajo conserva el punto de población y el reloj en la nueva sesión. Un cierre inesperado conserva las llegadas ya guardadas como práctica sin terminar.

**Reiniciar solo el reloj** guarda la sesión anterior y comienza otra en 0:00 desde el mismo paso. Podés asignarle una tecla en Ajustes; por defecto no reserva ninguna.

## Setup automático (Windows)

Activá **Ajustes → Setup automático** y volvé a AoE4. El control está apagado por defecto al actualizar, para conservar tu configuración anterior.

- Obtiene el área de la ventana de AoE4 y coloca el overlay dentro del juego. Guarda la calibración y posición personalizada por monitor, resolución y DPI.
- Busca los cuatro íconos de recursos y deriva la columna de aldeanos y el contador superior de inactivos. Requiere cinco números válidos y confirmaciones consecutivas. No usa población ni recursos acumulados.
- Busca el reloj visible en el centro superior, comprueba que avance y sincroniza la práctica sin cambiar el paso ni reescribir llegadas. Al perder la lectura congela el tiempo automático. No reinicia por Alt+Tab o una lectura aislada de cero.
- Para elegir build, indicá tu **nombre exacto en AoE4** y el modo una vez. Solo acepta una civilización asociada a tu fila en preparación/carga; usa su predeterminado o el único build disponible. Ante ambigüedad conserva el actual. La elección rápida recuerda el predeterminado.
- Iniciar, pausar, corregir o terminar manualmente tiene prioridad. **Volver al reloj del juego** vuelve a esperar una lectura válida. Una partida nueva solo se considera confirmada tras preparación/carga repetida y un reloj inicial que progresa.
- **Corregir la detección** abre los selectores con el mouse. **Volver a detectar** prueba otra vez sin la corrección guardada y solo reemplaza el perfil cuando valida las lecturas. Los perfiles viajan en el respaldo completo.

El detector está probado con las capturas del HUD incluidas como fixtures y escalas de 80%, 100%, 125% y 150% en imágenes de prueba. No garantiza cualquier distribución o skin del HUD; la calibración manual sigue disponible. La asociación de civilización requiere validar el diseño real de tu pantalla de carga: si no encuentra una fila inequívoca, elegí el build. No lanza AoE4 ni modifica ajustes del juego.

## OCR manual experimental (Windows)

Desactivado por defecto. Lee **los cuatro contadores de aldeanos asignados a recursos y el contador de inactivos**, no la población total ni los recursos acumulados. Suma comida + madera + oro + piedra + inactivos: por ejemplo, `10 + 9 + 0 + 0 + 2 = 21`. Avanza al completar la condición del paso actual: total de aldeanos, mínimos de recursos seleccionados o traslado entre recursos. No cuenta militares ni constructores que no aparezcan en estos contadores. El campo «POB» del build sigue siendo una referencia; no controla el OCR.

Con AoE4 en ventana sin bordes, entrá en **Ajustes → Avance automático → Seleccionar los cuatro contadores**. Elegí el monitor y marcá solo la columna numérica, dejando un número centrado en cada franja: comida, madera, oro y piedra. Incluí los ceros grises y dejá afuera íconos, recursos acumulados y aldeanos inactivos. Después usá **Seleccionar aldeanos inactivos** para marcar aparte el número superior junto al aldeano con “Z”, dejando espacio para tres cifras. Guardá ambas regiones y activá «Leer aldeanos e inactivos». Esc cancela sin modificar la región. Las calibraciones incompletas se desactivan hasta seleccionar ambas regiones.

Iniciá el reloj y volvé a AoE4: el estado muestra las cinco lecturas, el total y el objetivo. Se requieren tres lecturas consecutivas que cumplan la condición, con todos los contadores válidos; una lectura faltante nunca se toma como cero. Construcciones, subidas de edad e instrucciones ambiguas quedan manuales. Admite hasta 200 aldeanos entre asignados e inactivos. Se suspende al salir del juego, pausar el reloj o editar la posición. Windows necesita un idioma OCR instalado. La precisión depende de resolución, escala del HUD y región. No lee memoria ni envía acciones al juego.

## Verificación

`npm test` (Node 24+ para las pruebas), `npm run check`, `npm run build` y `cargo test --manifest-path src-tauri/Cargo.toml`.

Prueba manual en Windows: alternar AoE4/otra app y comprobar AvPág/RePág; cerrar/abrir desde bandeja; arrastrar y reiniciar; mover entre monitores con distinto DPI; exportar/restaurar una biblioteca de prueba; iniciar el reloj desde un paso intermedio; calibrar OCR con el HUD real.

### Criterio de avance de cada paso

Debajo de cada fila del editor, **Avance del paso** muestra la condición sugerida y permite elegir Manual, Total, Mínimos por recurso o Traslado. Se comprueba la instrucción que está visible antes de mostrar la siguiente. Los builds guardados e importados reciben sugerencias sin cambiar sus textos; las elecciones explícitas se incluyen al copiar, clonar y respaldar.

- **Total:** suma los cuatro recursos y los inactivos; no usa población ni exige reparto.
- **Mínimos:** «Llegar a 10 en comida» requiere al menos 10 en comida. Admite extras en cualquier recurso. Los inactivos no satisfacen un mínimo de recurso.
- **Traslado:** «2 de oro a madera» compara con un reparto inicial estable y exige que oro disminuya al menos 2 y madera aumente al menos 2. Tener madera de sobra desde antes no basta. Una pérdida de lectura o Alt+Tab conserva el punto de comparación; cambiar de paso, práctica o criterio lo reinicia. Si el traslado ya se hizo antes de obtener el reparto inicial, usá AvPág.
- **Manual:** construir, subir de edad, mejoras o instrucciones que no se reconocen con confianza. El OCR de aldeanos no confirma esas acciones. Las sugerencias son conservadoras; revisá los criterios de builds importados, especialmente si combinan varias instrucciones.

El estado del overlay explica la condición pendiente o pide AvPág. Incluso cuando se completa automáticamente el último objetivo, la práctica se termina manualmente. Los cambios netos en contadores no prueban la identidad de los aldeanos: muertes o varias reasignaciones simultáneas pueden producir el mismo cambio.
### Al completar el build

AvPág desde el último paso (o «Terminar práctica» estando en el último) muestra «¡Build completado!» con un poco de confeti durante unos dos segundos y oculta el overlay. La app continúa en la bandeja y conserva el historial. No se celebra al cambiar de build ni al terminar una práctica a mitad de camino. El último paso siempre se confirma manualmente. Ctrl + Alt + H vuelve a mostrar el overlay (o el atajo que hayas configurado); una nueva práctica o cambiar de build también lo recupera. La animación respeta la preferencia de movimiento reducido de Windows y no tiene sonido.
