@echo off
setlocal enabledelayedexpansion
title Personal Planner — Build Windows Installer

:: Always run from the directory this .bat lives in (so all relative paths work)
cd /d "%~dp0"

echo.
echo  ============================================================
echo   Personal Planner — Windows Installer Builder
echo   Output: Output\PersonalPlannerSetup_v0.7.0.exe
echo  ============================================================
echo.

:: ── Check Python ──────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found.
    echo         Install Python 3.11+ from https://python.org/downloads/
    echo         Make sure to check "Add python.exe to PATH" during install.
    pause & exit /b 1
)

:: ── Check Node.js ─────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo         Install Node.js 18+ from https://nodejs.org/
    pause & exit /b 1
)

:: ── Step 1: Python dependencies ───────────────────────────────
echo [1/6] Installing Python dependencies (including PyInstaller)...
pip install -r requirements.txt pyinstaller --quiet --upgrade
if errorlevel 1 (
    echo [ERROR] pip install failed. Check your internet connection.
    pause & exit /b 1
)
echo       Done.

:: ── Step 2: Build React frontend ──────────────────────────────
echo [2/6] Building React frontend...
cd frontend
:: Force npm to use cmd.exe for scripts — avoids PowerShell execution policy blocks
npm config set script-shell "%SystemRoot%\System32\cmd.exe" 2>nul
call npm install --silent
if errorlevel 1 ( echo [ERROR] npm install failed & cd .. & pause & exit /b 1 )
call npm run build
if errorlevel 1 ( echo [ERROR] npm build failed & cd .. & pause & exit /b 1 )
cd ..
echo       Done.

:: ── Step 3: Download Ollama installer ────────────────────────
echo [3/6] Downloading Ollama installer (bundled for offline AI setup)...
powershell -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile 'OllamaSetup.exe' -UseBasicParsing"
if not exist OllamaSetup.exe (
    echo [WARN] Could not download OllamaSetup.exe.
    echo        The installer will still work but Ollama/AI features will not be bundled.
    echo        Users can install Ollama manually from https://ollama.com
    echo        Creating a placeholder so Inno Setup does not fail...
    echo placeholder > OllamaSetup.exe
)
echo       Done.

:: ── Step 4: PyInstaller ───────────────────────────────────────
echo [4/6] Bundling app with PyInstaller (this may take 2-5 minutes)...
:: Use "python -m PyInstaller" instead of the pyinstaller command —
:: the command may not be on PATH on a fresh PC, but the module always works
:: as long as pip installed it into the active Python.
python -m PyInstaller PersonalPlanner.spec --noconfirm --clean
if errorlevel 1 (
    echo [ERROR] PyInstaller failed. See output above for details.
    pause & exit /b 1
)
echo       Done. Bundle is in dist\PersonalPlanner\

:: ── Step 5: Find Inno Setup ───────────────────────────────────
echo [5/6] Looking for Inno Setup 6...
set ISCC=""

if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe"       set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"

if %ISCC%=="" (
    echo.
    echo  [!] Inno Setup not found.
    echo      Download and install it from: https://jrsoftware.org/isdl.php
    echo      Then re-run this script to create the installer .exe.
    echo.
    echo      The PyInstaller bundle is already ready in: dist\PersonalPlanner\
    echo      You can run PersonalPlanner.exe from there directly.
    echo.
    pause & exit /b 0
)

:: ── Step 6: Build installer ───────────────────────────────────
echo [6/6] Compiling Inno Setup installer...
mkdir Output 2>nul

:: Sanity-check: make sure PyInstaller produced its output
if not exist "dist\PersonalPlanner\PersonalPlanner.exe" (
    echo [ERROR] dist\PersonalPlanner\PersonalPlanner.exe not found.
    echo         PyInstaller did not produce the expected output.
    echo         Check the PyInstaller log above for details.
    pause ^& exit /b 1
)

"%ISCC%" installer.iss
if errorlevel 1 (
    echo [ERROR] Inno Setup compilation failed. See output above.
    pause & exit /b 1
)

echo.
echo  ============================================================
echo   SUCCESS!
echo   Installer: Output\PersonalPlannerSetup_v0.7.0.exe
echo.
echo   Share this file with anyone — it installs Personal Planner
echo   as a proper Windows app with Start Menu + optional shortcuts.
echo  ============================================================
echo.
pause
