@echo off
setlocal
cd /d "%~dp0"
echo KARMA: Same-Windows-PC Wave17 vs Latest WebGL2 benchmark
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows_compare.ps1"
if errorlevel 1 pause
