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
- Cerrar la ventana de gestión cierra la app. Para jugar, minimizala.

### Teclas por defecto (se cambian en Ajustes)

| Acción | Tecla |
| --- | --- |
| Paso siguiente | AvPág |
| Paso anterior | RePág |
| Iniciar partida (paso 1 y reloj en 0:00) | Ctrl + Alt + S |
| Mostrar / ocultar overlay | Ctrl + Alt + H |
| Modo compacto | Ctrl + Alt + C |
| Cambiar de build (misma civilización) | Ctrl + Alt + B |

Mientras la app está abierta, Windows reserva esas combinaciones para el overlay: no llegan al
juego ni a otros programas. Si una no se pudo registrar, Ajustes lo avisa.

### Builds

- Cada paso tiene población que lo dispara, tiempo objetivo (opcional), acción, nota y el reparto
  de aldeanos al que hay que llegar. El overlay resalta solo lo que cambia respecto del paso anterior.
- "Clonar" copia un build para editar solo lo distinto.
- "Copiar JSON" / "Importar" sirven para respaldar o compartir builds.
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

## Pendiente

- Ícono en la bandeja del sistema.
- Ocultar el overlay cuando AoE4 no es la ventana activa.
- Elegir monitor (hoy usa el monitor donde arranca la ventana).
- Avance automático leyendo la población de la pantalla (OCR).
