@echo off
set "ROOT=%~dp0"
set "ROOTARG=%~dp0."
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\stop.ps1" "%ROOTARG%"
if errorlevel 1 pause
