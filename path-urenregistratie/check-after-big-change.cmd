@echo off
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%check-after-big-change.ps1"
exit /b %ERRORLEVEL%
