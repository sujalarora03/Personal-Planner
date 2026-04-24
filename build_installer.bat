@echo off
setlocal enabledelayedexpansion
title Personal Planner — Build Windows Installer

:: Always run from the directory this .bat file lives in
cd /d "%~dp0"

:: Log file — captures everything; readable after window closes
set "LOG=%~dp0build_log.txt"
echo Build started: %DATE% %TIME% > "%LOG%"

goto :main

:log
echo %~1
echo %~1 >> "%LOG%"
goto :eof

:main

call :log ""
call :log " ============================================================"
call :log "  Personal Planner -- Windows Installer Builder"
call :log "  Log saved to: build_log.txt  (open this if window closes)"
call :log " ============================================================"
call :log ""

:: ── Check Python ──────────────────────────────────────────────────────
python --version >> "%LOG%" 2>&1
if errorlevel 1 (
    call :log "[ERROR] Python not found in PATH."
    call :log "        Install from https://python.org/downloads/"
    call :log "        During install, tick: Add python.exe to PATH"
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do call :log "        Python: %%v"

:: ── Check Node.js ─────────────────────────────────────────────────────
node --version >> "%LOG%" 2>&1
if errorlevel 1 (
    call :log "[ERROR] Node.js not found in PATH."
    call :log "        Install from https://nodejs.org/"
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>^&1') do call :log "        Node.js: %%v"

:: ── Step 1: Python dependencies ───────────────────────────────────────
call :log ""
call :log "[1/6] Installing Python dependencies + PyInstaller..."
pip install -r requirements.txt pyinstaller --quiet --upgrade >> "%LOG%" 2>&1
if errorlevel 1 (
    call :log "[ERROR] pip install failed."
    call :log "        Check build_log.txt - common causes: no internet, proxy."
    pause & exit /b 1
)
call :log "      Done."

:: ── Step 2: Build React frontend ──────────────────────────────────────
call :log ""
call :log "[2/6] Building React frontend..."
cd frontend
npm config set script-shell "%SystemRoot%\System32\cmd.exe" >> "%LOG%" 2>&1
call :log "      Running npm install..."
call npm install --silent >> "%LOG%" 2>&1
if errorlevel 1 (
    call :log "[ERROR] npm install failed. See build_log.txt."
    cd .. & pause & exit /b 1
)
call :log "      Running npm run build..."
call npm run build >> "%LOG%" 2>&1
if errorlevel 1 (
    call :log "[ERROR] npm build failed. See build_log.txt."
    cd .. & pause & exit /b 1
)
cd ..
call :log "      Frontend built."

:: ── Step 3: Download Ollama installer ─────────────────────────────────
call :log ""
call :log "[3/6] Preparing Ollama installer..."
if exist OllamaSetup.exe (
    call :log "      OllamaSetup.exe already present, skipping download."
) else (
    call :log "      Downloading (~150 MB, may take a few minutes)..."
    powershell -Command "$ProgressPreference='SilentlyContinue'; try { Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile 'OllamaSetup.exe' -UseBasicParsing } catch { Write-Host $_.Exception.Message }" >> "%LOG%" 2>&1
    if not exist OllamaSetup.exe (
        call :log "      [WARN] Download failed - creating placeholder."
        call :log "             Users can install Ollama manually from https://ollama.com"
        echo placeholder > OllamaSetup.exe
    ) else (
        call :log "      Downloaded OK."
    )
)

:: ── Step 4: PyInstaller ───────────────────────────────────────────────
call :log ""
call :log "[4/6] Bundling app with PyInstaller (2-5 minutes)..."
call :log "      Please wait, console may appear quiet during this step..."
python -m PyInstaller PersonalPlanner.spec --noconfirm --clean >> "%LOG%" 2>&1
if errorlevel 1 (
    call :log "[ERROR] PyInstaller failed. Open build_log.txt and search 'Error'."
    pause & exit /b 1
)
if not exist "dist\PersonalPlanner\PersonalPlanner.exe" (
    call :log "[ERROR] PyInstaller ran but PersonalPlanner.exe was not produced."
    call :log "        Check build_log.txt for details."
    pause & exit /b 1
)
call :log "      Bundle ready: dist\PersonalPlanner\"

:: ── Step 5: Find or auto-install Inno Setup ───────────────────────────
call :log ""
call :log "[5/6] Locating Inno Setup 6..."
set "ISCC="

:: Check the two standard install locations first
if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe"       set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"

:: Fallback 1: look it up in the registry (works for any install location)
if not defined ISCC (
    for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Inno Setup 6_is1" /v "InstallLocation" 2^>nul') do set "ISCC=%%bISCC.exe"
)
if not defined ISCC (
    for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Inno Setup 6_is1" /v "InstallLocation" 2^>nul') do set "ISCC=%%bISCC.exe"
)

:: Fallback 2: search PATH
if not defined ISCC (
    for /f "tokens=*" %%p in ('where ISCC.exe 2^>nul') do set "ISCC=%%p"
)

if not defined ISCC (
    call :log "      Not installed. Downloading Inno Setup 6 installer..."
    powershell -Command "$ProgressPreference='SilentlyContinue'; try { Invoke-WebRequest -Uri 'https://jrsoftware.org/download.php/is.exe' -OutFile '%TEMP%\innosetup_installer.exe' -UseBasicParsing } catch { Write-Host $_.Exception.Message }" >> "%LOG%" 2>&1
    if exist "%TEMP%\innosetup_installer.exe" (
        call :log "      Installing Inno Setup silently..."
        "%TEMP%\innosetup_installer.exe" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART >> "%LOG%" 2>&1
        if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
        if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe"       set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"
    ) else (
        call :log "      Could not download Inno Setup installer."
    )
)

if not defined ISCC (
    call :log ""
    call :log " ============================================================"
    call :log "  Inno Setup 6 could not be found or installed automatically."
    call :log ""
    call :log "  Your app bundle IS ready and works:"
    call :log "    dist\PersonalPlanner\PersonalPlanner.exe  <- run this to test"
    call :log ""
    call :log "  To produce the one-click Setup.exe:"
    call :log "    1. Download Inno Setup 6: https://jrsoftware.org/isdl.php"
    call :log "    2. Install it, then re-run build_installer.bat"
    call :log "    OR open installer.iss in Inno Setup Compiler -> Compile"
    call :log " ============================================================"
    call :log ""
    pause & exit /b 0
)
call :log "      Found: %ISCC%"

:: ── Step 6: Compile installer ─────────────────────────────────────────
call :log ""
call :log "[6/6] Compiling Setup.exe with Inno Setup..."
mkdir Output 2>nul
"%ISCC%" installer.iss >> "%LOG%" 2>&1
if errorlevel 1 (
    call :log "[ERROR] Inno Setup compilation failed."
    call :log "        Open build_log.txt and look for the ISCC error near the bottom."
    pause & exit /b 1
)

call :log ""
call :log " ============================================================"
call :log "  BUILD SUCCESSFUL!"
call :log "  Installer: Output\PersonalPlannerSetup_v0.7.0.exe"
call :log "  Full log : build_log.txt"
call :log " ============================================================"
call :log ""
echo.
echo  Output\PersonalPlannerSetup_v0.7.0.exe is ready.
echo.
pause
