@echo off
cd /d "%~dp0"
title MIRA
if not exist "backend\node_modules" ( echo Run setup.bat first: backend packages are missing. & pause & exit /b 1 )
if not exist "frontend\node_modules" ( echo Run setup.bat first: frontend packages are missing. & pause & exit /b 1 )
echo Starting MIRA backend and frontend in two windows...
start "MIRA backend (keep open)" /D "%~dp0backend" cmd /k npm run start:dev
timeout /t 10 /nobreak >nul
start "MIRA frontend (keep open)" /D "%~dp0frontend" cmd /k npm run dev
echo Waiting for the frontend to be ready...
timeout /t 8 /nobreak >nul
start "" http://localhost:5173
echo.
echo MIRA should open in your browser: http://localhost:5173
echo If the page says "can't be reached", wait until the frontend window shows "ready", then press F5.
echo Login: muzakki@mira.local / mira1234
echo To stop MIRA, close the two "MIRA ... (keep open)" windows.
pause
