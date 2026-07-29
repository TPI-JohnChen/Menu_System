@echo off
title AI Provider Settings Manager

:menu
cls
echo ========================================
echo   AI Provider Settings - Manager
echo ========================================
echo.
echo   [1] Start Services
echo   [2] Stop Services
echo   [3] Check Status
echo   [4] Exit
echo.
set /p choice=Select (1-4): 

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto status
if "%choice%"=="4" goto exit
echo.
echo Invalid selection.
timeout /t 2 >nul
goto menu

:start
cls
echo ========================================
echo   Starting Services
echo ========================================
echo.
echo [1/3] Starting AI Proxy...
start "AI Proxy" cmd /c "cd /d C:\D\ai_cli\Menu_System\ai-proxy && npm start"
timeout /t 3 /nobreak >nul

echo [2/3] Checking Proxy...
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel%==0 (
    echo       Proxy is running
) else (
    echo       Proxy starting, please wait...
    timeout /t 3 /nobreak >nul
)

echo [3/3] Opening browser...
start "" "http://localhost:3001/pages/provider-management.html"

echo.
echo ========================================
echo   All services started!
echo   - Web Menu: http://localhost:3001/index.html
echo   - AI Proxy: http://localhost:3001
echo ========================================
echo.
pause
goto menu

:stop
cls
echo ========================================
echo   Stopping Services
echo ========================================
echo.
echo Stopping AI Proxy...

tasklist /FI "IMAGENAME eq node.exe" 2>nul | find "node.exe" >nul
if %errorlevel%==0 (
    echo Found node process, stopping...
    taskkill /F /IM node.exe >nul 2>&1
    echo AI Proxy stopped.
) else (
    echo AI Proxy is not running.
)

echo.
pause
goto menu

:status
cls
echo ========================================
echo   Service Status
echo ========================================
echo.
echo Checking AI Proxy...
echo.

curl -s http://localhost:3001/api/health 2>nul
if %errorlevel%==0 (
    echo.
    echo Status: Running
) else (
    echo.
    echo Status: Not running
)

echo.
echo Checking Node.js processes...
echo.
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find "node.exe" >nul
if %errorlevel%==0 (
    echo Node.js: Running
    tasklist /FI "IMAGENAME eq node.exe" 2>nul
) else (
    echo Node.js: Not running
)

echo.
pause
goto menu

:exit
exit
