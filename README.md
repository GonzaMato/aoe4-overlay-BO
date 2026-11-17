# AoE4 Overlay

Overlay de build orders para Age of Empires IV. Muestra un paso a la vez arriba del juego,
avanza con teclas globales y guarda tus builds por civilización, modo y mapa.

Hecho con Tauri 2 (Rust) + SvelteKit (Svelte 5, TypeScript).

## Requisitos (Windows)

1. **Node.js** 20 o superior.
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
npm run tauri build
```

Queda en `src-tauri/target/release/bundle/`.

### Probar la interfaz sin Rust

```
npm run dev
```

Abrí `http://localhost:1420` (gestión) y `http://localhost:1420/overlay` (panel) en dos pestañas.
En este modo los datos se guardan en el navegador y las teclas solo funcionan con la pestaña
del overlay en foco. Sirve para ver y ajustar el diseño, no para jugar.

## Uso

- **El juego tiene que estar en "ventana sin bordes"**. En pantalla completa exclusiva el overlay queda tapado.
- Los clics atraviesan el overlay: todo se maneja con teclas.
- En la ventana de gestión elegís civilización y modo; si esa combinación tiene un build
  predeterminado, se carga solo en el overlay.
- **Salir de la app**, arriba a la derecha, guarda los cambios y cierra todo. La X de la ventana la oculta y deja la app en la bandeja. Desde el ícono podés abrirla, mover el overlay o salir.
- **Una sola instancia:** ejecutar de nuevo el programa recupera el overlay existente, sin reiniciar el paso ni el reloj. Fuera del juego abre la gestión y una vista previa que podés ocultar; al volver a AoE4 recupera la visibilidad automática.
- **Ajustes por categorías:** Overlay, Atajos, Avance automático, Listas y Respaldo. Los cambios se aplican automáticamente; la ubicación por píxeles está dentro de «Ubicación precisa por esquina y márgenes».
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
El reloj conserva su marcha al cambiar de aplicación; pausalo si pausás la partida.

### Builds

- Cada paso tiene población de referencia, tiempo objetivo (opcional), acción, nota y el reparto
  de aldeanos al que hay que llegar. El overlay resalta solo lo que cambia respecto del paso anterior.
- "Clonar" copia un build para editar solo lo distinto.
- "Copiar JSON" / "Importar" sirven para respaldar o compartir builds.
- También podés pegar el JSON de **aoe4guides → Overlay Tool**. Se convierten tiempos, recursos y notas; los iconos quedan como texto. La población desconocida (-1) queda vacía: no se confunde cantidad de aldeanos con población total. Revisá modo y población después de importar.
- Con el build en uso, el número de cada paso en el editor lo muestra en el overlay.
- Los dos builds que vienen cargados son ejemplos con números ilustrativos: reemplazalos por los tuyos.

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

## OCR experimental (Windows)

Desactivado por defecto. Lee **los cuatro contadores de aldeanos asignados a recursos y el contador de inactivos**, no la población total ni los recursos acumulados. Suma comida + madera + oro + piedra + inactivos: por ejemplo, `10 + 9 + 0 + 0 + 2 = 21`. Avanza cuando el total alcanza la suma de aldeanos del siguiente paso, sin exigir que coincida el reparto. No cuenta militares ni constructores que no aparezcan en estos contadores. El campo «POB» del build sigue siendo una referencia; no controla el OCR.

Con AoE4 en ventana sin bordes, entrá en **Ajustes → Avance automático → Seleccionar los cuatro contadores**. Elegí el monitor y marcá solo la columna numérica, dejando un número centrado en cada franja: comida, madera, oro y piedra. Incluí los ceros grises y dejá afuera íconos, recursos acumulados y aldeanos inactivos. Después usá **Seleccionar aldeanos inactivos** para marcar aparte el número superior junto al aldeano con “Z”, dejando espacio para tres cifras. Guardá ambas regiones y activá «Leer aldeanos e inactivos». Esc cancela sin modificar la región. Las calibraciones incompletas se desactivan hasta seleccionar ambas regiones.

Iniciá el reloj y volvé a AoE4: el estado muestra las cinco lecturas, el total y el objetivo. Se requieren tres totales consecutivos iguales, con todos los contadores válidos; una lectura faltante nunca se toma como cero. Los pasos que mantienen o reducen el total necesitan avance manual. Admite hasta 200 aldeanos entre asignados e inactivos. Se suspende al salir del juego, pausar el reloj o editar la posición. Windows necesita un idioma OCR instalado. La precisión depende de resolución, escala del HUD y región. No lee memoria ni envía acciones al juego.

## Verificación

`npm test` (Node 24+ para las pruebas), `npm run check`, `npm run build` y `cargo test --manifest-path src-tauri/Cargo.toml`.

Prueba manual en Windows: alternar AoE4/otra app y comprobar AvPág/RePág; cerrar/abrir desde bandeja; arrastrar y reiniciar; mover entre monitores con distinto DPI; exportar/restaurar una biblioteca de prueba; iniciar el reloj desde un paso intermedio; calibrar OCR con el HUD real.
