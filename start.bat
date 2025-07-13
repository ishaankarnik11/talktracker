@echo off
REM Talk Tracker Docker Startup Script for Windows

setlocal EnableDelayedExpansion

echo 🚀 Talk Tracker Docker Startup
echo ================================

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)

REM Parse arguments
set MODE=development
set DETACHED=
set SHOW_HELP=0

:parse_args
if "%1"=="" goto start_app
if "%1"=="-p" set MODE=production
if "%1"=="--production" set MODE=production
if "%1"=="-d" set DETACHED=-d
if "%1"=="--detach" set DETACHED=-d
if "%1"=="-h" set SHOW_HELP=1
if "%1"=="--help" set SHOW_HELP=1
shift
goto parse_args

:start_app
if %SHOW_HELP%==1 (
    echo Usage: %0 [OPTIONS]
    echo.
    echo Options:
    echo   -p, --production    Start in production mode with Nginx
    echo   -d, --detach        Run containers in detached mode
    echo   -h, --help          Show this help message
    echo.
    echo Examples:
    echo   %0                  Start in development mode
    echo   %0 -p -d           Start in production mode, detached
    echo   %0 --production    Start in production mode with logs
    pause
    exit /b 0
)

REM Check for .env file
if not exist .env (
    echo [WARNING] No .env file found. Using default configuration.
    echo [WARNING] For production, create a .env file with your settings.
    echo.
)

if "%MODE%"=="production" (
    echo [INFO] Starting Talk Tracker in PRODUCTION mode with Nginx...
    docker-compose --profile production up %DETACHED%
    
    if not "%DETACHED%"=="" (
        echo [SUCCESS] Talk Tracker started in production mode!
        echo.
        echo 🌐 Application URLs:
        echo    Main app: http://localhost
        echo    Direct:   http://localhost:3000
        echo.
        echo 📋 Management commands:
        echo    View logs:    docker-compose logs -f
        echo    Stop:         docker-compose down
        echo    Status:       docker-compose ps
        pause
    )
) else (
    echo [INFO] Starting Talk Tracker in DEVELOPMENT mode...
    docker-compose up %DETACHED%
    
    if not "%DETACHED%"=="" (
        echo [SUCCESS] Talk Tracker started in development mode!
        echo.
        echo 🌐 Application URL: http://localhost:3000
        echo.
        echo 📋 Management commands:
        echo    View logs:    docker-compose logs -f
        echo    Stop:         docker-compose down
        echo    Status:       docker-compose ps
        pause
    )
)