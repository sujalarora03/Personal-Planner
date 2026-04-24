@echo off
setlocal enabledelayedexpansion
title Personal Planner — Build Windows Installer

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
echo [3/6] Installing Python dependencies (including PyInstaller)...
pip install -r requirements.txt pyinstaller --quiet --upgrade
if errorlevel 1 (
    echo [ERROR] pip install failed. Check your internet connection.
    pause & exit /b 1
)
echo       Done.

:: ── Step 2: Build React frontend ──────────────────────────────
echo [2/6] Building React frontend...
cd frontend
call npm install --silent
if errorlevel 1 ( echo [ERROR] npm install failed & cd .. & pause & exit /b 1 )
call npm run build
if errorlevel 1 ( echo [ERROR] npm build failed & cd .. & pause & exit /b 1 )
cd ..
echo       Done.

:: ── Step 2b: Download Ollama installer ────────────────────────
echo [2b/6] Downloading Ollama installer (bundled for offline AI setup)...
powershell -Command "Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile 'OllamaSetup.exe' -UseBasicParsing"
if not exist OllamaSetup.exe (
    echo [WARN] Could not download OllamaSetup.exe.
    echo        The installer will still work but Ollama/AI features will not be bundled.
    echo        Users can install Ollama manually from https://ollama.com
    echo        Creating a placeholder so Inno Setup does not fail...
    echo placeholder > OllamaSetup.exe
)
echo       Done.

:: ── Step 3: PyInstaller ───────────────────────────────────────
echo [4/6] Bundling app with PyInstaller (this may take 2-5 minutes)...
pyinstaller PersonalPlanner.spec --noconfirm --clean
if errorlevel 1 (
    echo [ERROR] PyInstaller failed. See output above for details.
    pause & exit /b 1
)
echo       Done. Bundle is in dist\PersonalPlanner\

:: ── Step 4: Find Inno Setup ───────────────────────────────────
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

:: ── Step 5: Build installer ───────────────────────────────────
echo [6/6] Compiling Inno Setup installer...
mkdir Output 2>nul
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
