@echo off
cd /d "%~dp0src"
echo Gerando build de distribuicao Windows (Aethereal Music)...
call npm run dist:win
echo.
if %errorlevel% equ 0 (
  echo Build concluido! Arquivos em: %~dp0release\
) else (
  echo Falha no build (codigo %errorlevel%).
)
pause
