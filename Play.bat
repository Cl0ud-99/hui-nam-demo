@echo off
title 回南 HUI NAM
cd /d "%~dp0"
echo.
echo   回南 HUI NAM  -  Hong Kong tenement horror demo
echo   ------------------------------------------------
echo   starting local server, your browser will open...
echo.
node server.js --open
pause
