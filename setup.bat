@echo off
setlocal
cd /d "%~dp0"
title MIRA setup
echo ==================================================
echo  MIRA setup (run once)
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js not found. Install Node.js 20 LTS from https://nodejs.org then run this again.
  pause & exit /b 1
)
for /f %%v in ('node -v') do echo [OK] Node.js %%v

echo.
echo PostgreSQL connection (press Enter to accept the value in brackets)
set "PGPORT="
set /p PGPORT=  Port [5432]: 
if "%PGPORT%"=="" set "PGPORT=5432"
set "PGUSER="
set /p PGUSER=  User [postgres]: 
if "%PGUSER%"=="" set "PGUSER=postgres"
set "PGPASS="
set /p PGPASS=  Password (the one you chose when installing PostgreSQL): 

netstat -ano | findstr ":%PGPORT% " | findstr "LISTENING" >nul
if errorlevel 1 (
  echo.
  echo [X] Nothing is running on port %PGPORT%.
  echo     Install PostgreSQL 16 from https://www.postgresql.org/download/windows/
  echo     or start the "postgresql" service in Windows Services, then run this again.
  pause & exit /b 1
)
echo [OK] PostgreSQL is listening on port %PGPORT%

echo.
echo Writing backend\.env ...
(
  echo DATABASE_URL="postgresql://%PGUSER%:%PGPASS%@localhost:%PGPORT%/elina_db?schema=public"
  echo JWT_SECRET="elina-dev-secret-change-before-going-live"
  echo JWT_EXPIRES_IN="8h"
  echo STOREKEEPER_NAME="Muzakki"
  echo STOREKEEPER_SECTION="Project Engineer"
  echo STOREKEEPER_EMAIL=""
  echo SMTP_HOST=""
  echo SMTP_PORT=587
  echo SMTP_USER=""
  echo SMTP_PASS=""
  echo MAIL_FROM="MIRA ^<mira@solaraccess.id^>"
  echo CALIBRATION_REPORT_TO=""
  echo PORT=3000
  echo UPLOAD_DIR="uploads"
) > backend\.env

echo.
echo [1/4] Installing backend packages (a few minutes)...
cd backend
call npm install
if errorlevel 1 goto fail

echo.
echo [2/4] Creating database tables...
call npx prisma migrate dev --name init
if errorlevel 1 goto dbfail

echo.
echo [3/4] Loading your 91 assets and demo users...
call npm run seed
if errorlevel 1 goto fail

echo.
echo [4/4] Installing frontend packages...
cd ..\frontend
call npm install
if errorlevel 1 goto fail

echo.
echo ==================================================
echo  Setup complete. Now double-click start.bat
echo  Login: muzakki@mira.local / mira1234
echo ==================================================
pause
exit /b 0

:dbfail
echo.
echo [X] Could not connect to the database. Check the password and port, then run setup.bat again.
echo     Passwords with special characters like @ # / : %% ^& may break the connection string.
pause & exit /b 1

:fail
echo.
echo [X] Something failed above. Copy the red/error lines and send them for help.
pause & exit /b 1
