@echo off
title Personal Planner - Install
echo ============================================
echo   Personal Planner - Installing dependencies
echo ============================================
echo.

echo [1/3] Installing Python packages...
pip install -r "%~dp0requirements.txt"
if errorlevel 1 (
    echo ERROR: pip install failed. Make sure Python 3.11+ is installed.
    pause
    exit /b 1
)

echo.
echo [2/3] Checking for Node.js (needed to build the UI)...
where node >nul 2>&1
if errorlevel 1 (
    echo WARNING: Node.js not found. Skipping frontend build.
    echo If the app shows a blank screen, install Node.js from https://nodejs.org
    echo and re-run install.bat
    goto :done
)

echo [3/3] Building the React frontend...
cd /d "%~dp0frontend"
call npm install
call npm run build
cd /d "%~dp0"

if not exist "%~dp0frontend\dist\index.html" (
    echo ERROR: Frontend build failed. Run install.bat again after fixing errors.
    pause
    exit /b 1
)

:done
echo.
echo ============================================
echo   Done! Run the app with: run.bat
echo ============================================
pause
