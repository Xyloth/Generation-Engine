@echo off
set "ROOT=%~dp0"
set "ROOTARG=%~dp0."
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\start.ps1" "%ROOTARG%"
if errorlevel 1 pause
