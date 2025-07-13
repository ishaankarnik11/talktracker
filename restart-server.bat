@echo off
echo Stopping existing server...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo Starting server on port 3003...
set PORT=3003
node server.js