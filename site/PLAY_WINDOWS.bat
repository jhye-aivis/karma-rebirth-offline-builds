@echo off
setlocal
cd /d "%~dp0"
echo KARMA REBIRTH Windows Offline Edition - local only
echo No Internet connection required. Close window to end game server.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve_windows.ps1"
if errorlevel 1 pause
