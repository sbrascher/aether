@echo off
cd /d "%~dp0src"
start "" "%~dp0src\node_modules\electron\dist\electron.exe" "%~dp0src"
