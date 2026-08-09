@echo off
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-path-app.ps1" %*
if errorlevel 1 (
	echo.
	echo Het startscript is gestopt met een fout.
	pause
	exit /b 1
)
exit /b 0
