@echo off
chcp 65001 >nul
setlocal
title Gestion Documentaria - Instalar y Ejecutar
cd /d "%~dp0"

echo ============================================================
echo    SISTEMA DE GESTION DOCUMENTARIA
echo    Instalacion automatica y arranque
echo ============================================================
echo.

REM === Corrige el error de esbuild "Expected X but got Y" ===
REM 1) Borra la variable en ESTA sesion
set "ESBUILD_BINARY_PATH="
REM 2) Borra la variable de forma permanente del usuario (si existe)
reg delete HKCU\Environment /F /V ESBUILD_BINARY_PATH >nul 2>&1

echo [1/4] Quitando esbuild global si estuviera instalado...
call npm uninstall -g esbuild >nul 2>&1

echo [2/4] Instalando dependencias. Esto puede tardar varios minutos...
echo       (Si parece detenido, esta trabajando. Espera.)
echo.
call npm install
if errorlevel 1 goto ERROR

echo.
echo [3/4] Verificando esbuild...
call npm rebuild esbuild
if errorlevel 1 goto ERROR

echo.
echo [4/4] Iniciando el servidor y abriendo el navegador...
echo.
echo ============================================================
echo    El sistema se abrira solo en http://localhost:3000
echo    Usa Chrome o Edge para la funcion de carpeta.
echo    PARA DETENER: cierra esta ventana.
echo ============================================================
echo.

REM Abre el navegador 12 segundos despues de arrancar el servidor
start "" cmd /c "timeout /t 12 >nul & start http://localhost:3000"

call npm run dev
goto FIN

:ERROR
echo.
echo ============================================================
echo    HUBO UN ERROR.
echo    Saca una foto o copia el texto de arriba y enviaselo a
echo    Claude para resolverlo.
echo.
echo    Si menciona OneDrive o archivos bloqueados: pausa OneDrive
echo    (icono de la nube - Pausar sincronizacion) y vuelve a
echo    ejecutar este archivo.
echo ============================================================

:FIN
echo.
echo Presiona una tecla para cerrar esta ventana...
pause >nul
