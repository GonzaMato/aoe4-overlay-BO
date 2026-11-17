@echo off
rem ---------------------------------------------------------------------------
rem  AoE4 Overlay - lanzador
rem
rem    iniciar.bat            abre la app; compila antes solo si hace falta
rem    iniciar.bat rebuild    fuerza una compilacion y despues abre
rem    iniciar.bat dev        modo desarrollo (recarga al guardar cambios)
rem
rem  "Si hace falta" = no existe el ejecutable, o algun archivo del proyecto
rem  es mas nuevo que el ejecutable.
rem ---------------------------------------------------------------------------
setlocal
chcp 65001 >nul
title AoE4 Overlay
cd /d "%~dp0"

set "EXE=src-tauri\target\release\aoe4-overlay.exe"
set "MODE=%~1"

if /i "%MODE%"=="dev" goto :check_tools
if /i "%MODE%"=="rebuild" goto :check_tools
if not exist "%EXE%" goto :check_tools

rem Sale con 1 si hay archivos del proyecto mas nuevos que el ejecutable.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$exe = (Get-Item -LiteralPath '%EXE%').LastWriteTime; $dirs = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue 'src', 'static', 'src-tauri\src', 'src-tauri\capabilities', 'src-tauri\icons'; $files = Get-Item -ErrorAction SilentlyContinue 'package.json', 'svelte.config.js', 'vite.config.js', 'tsconfig.json', 'src-tauri\tauri.conf.json', 'src-tauri\Cargo.toml', 'src-tauri\build.rs'; $newer = @($dirs) + @($files) | Where-Object { $_.LastWriteTime -gt $exe } | Select-Object -First 1; if ($newer) { exit 1 } else { exit 0 }"
if errorlevel 1 goto :check_tools
goto :run

:check_tools
where node >nul 2>nul
if errorlevel 1 goto :no_node
where cargo >nul 2>nul
if errorlevel 1 goto :no_cargo

if exist "node_modules\" goto :deps_ok
echo.
echo Instalando dependencias. Solo pasa la primera vez...
echo.
call npm install
if errorlevel 1 goto :failed
:deps_ok

if /i "%MODE%"=="dev" goto :dev

:build
tasklist /FI "IMAGENAME eq aoe4-overlay.exe" 2>nul | find /I "aoe4-overlay.exe" >nul
if not errorlevel 1 goto :running_build
echo.
echo Compilando AoE4 Overlay. La primera vez tarda varios minutos...
echo.
call npm run tauri build -- --no-bundle
if errorlevel 1 goto :failed
if not exist "%EXE%" goto :no_exe

:run
tasklist /FI "IMAGENAME eq aoe4-overlay.exe" 2>nul | find /I "aoe4-overlay.exe" >nul
if not errorlevel 1 goto :already_running
start "" "%EXE%"
exit /b 0

:dev
echo.
echo Modo desarrollo. Para terminar: cerrar esta ventana o Ctrl+C.
echo.
call npm run tauri dev
exit /b %errorlevel%

:already_running
echo.
echo AoE4 Overlay ya esta abierto.
timeout /t 3 >nul
exit /b 0

:running_build
echo.
echo Hay que compilar, pero AoE4 Overlay esta abierto y Windows no deja
echo reemplazar el ejecutable. Cerrar la app y volver a ejecutar este archivo.
goto :wait

:no_node
echo.
echo Falta Node.js. Instalar la version LTS desde https://nodejs.org
echo y volver a ejecutar este archivo.
goto :wait

:no_cargo
echo.
echo Falta Rust. Pasos de instalacion: https://v2.tauri.app/start/prerequisites/
echo Despues, volver a ejecutar este archivo.
goto :wait

:no_exe
echo.
echo La compilacion termino pero no se encontro %EXE%
goto :wait

:failed
echo.
echo Algo fallo. El error esta en las lineas de arriba.
echo.
echo Si dice "linker link.exe not found", faltan las herramientas de C++ de
echo Visual Studio. Instalarlas con este comando y volver a ejecutar este archivo:
echo.
echo   winget install --id Microsoft.VisualStudio.2022.Community --source winget --force --override "--add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 --add Microsoft.VisualStudio.Component.VC.Tools.ARM64 --add Microsoft.VisualStudio.Component.Windows11SDK.22621 --addProductLang En-us"

:wait
echo.
pause
exit /b 1