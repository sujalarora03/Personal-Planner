@echo off
title Personal Planner — Install
echo ============================================
echo   Personal Planner - Installing dependencies
echo ============================================
echo.

pip install -r "%~dp0requirements.txt"

echo.
echo ============================================
echo   Done! Run the app with: run.bat
echo ============================================
pause
