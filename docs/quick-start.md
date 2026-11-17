# Empezar en un minuto

1. Descargá el instalador de [GitHub Releases](https://github.com/GonzaMato/aoe4-overlay-BO/releases).
   Elegí el archivo `AoE4 Overlay_<versión>_x64-setup.exe`. No necesitás Node ni Rust.
2. Instalá y abrí **AoE4 Overlay**. En **Inicio**, elegí el build de tu civilización.
3. Tocá **Continuar con detección** y abrí una partida de práctica en ventana sin bordes.
4. Dejá visible el HUD unos segundos. El overlay muestra comida, madera, oro, piedra e inactivos.
   Volvé con **Alt + Tab**, compará los cinco números y confirmá **Los cinco números coinciden**.
5. Volvé al juego. El reloj se sincroniza cuando puede leerlo; si no, usá **Ctrl + Alt + S**.
   **AvPág** confirma tareas manuales; **RePág** vuelve atrás. Los objetivos de aldeanos usan OCR.

Construcciones, edad, ejército y acciones que los contadores no prueban siguen siendo manuales.
Al confirmar la última tarea, una celebración breve oculta el overlay.
**Ctrl + Alt + H** muestra u oculta el overlay. Cerrá todo desde **Salir de la app**; la X solo
oculta la gestión. Volver a abrir el acceso directo recupera la instancia existente.

## Si algo falla

- **No encuentro el juego:** volvé a AoE4, con una partida y HUD visibles, en ventana sin bordes.
- **Falta un idioma OCR:** revisá los paquetes de idioma de Windows y reiniciá la app.
- **Números incorrectos:** elegí **No coinciden** y corregí las regiones con el mouse.
- **Paso sin avance:** puede requerir confirmación manual, una lectura válida o iniciar el reloj.
- **Ayuda → Preparar diagnóstico → Copiar diagnóstico:** revisá el texto y compartilo en un
  [issue](https://github.com/GonzaMato/aoe4-overlay-BO/issues). Las capturas son voluntarias.

## Builds y actualizaciones

El paquete inicial contiene una apertura por civilización, con autor, fuente y revisión de
instrucciones; no garantiza que sea la estrategia óptima del parche. Podés modificar tu copia.
En instalaciones anteriores, **Inicio → Añadir paquete de civilizaciones** agrega los que faltan
sin reemplazar tus builds. También podés importar `starter-pack.json`; no contiene datos personales.

**Ayuda → Buscar actualizaciones** consulta GitHub solo al pulsarlo. Descargá el instalador nuevo,
exportá un respaldo desde **Ajustes → Respaldo** y cerrá la app antes de actualizar.
No se descarga ni instala nada automáticamente.

Esta app no está afiliada a World's Edge. No hay confirmación oficial de su uso en competitivo;
la beta está orientada a práctica. Windows puede mostrar advertencias porque el instalador no está firmado.
