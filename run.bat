@echo off
echo Starting Advisor...
cd /d "%~dp0"
node backend/src/index.js
pause
