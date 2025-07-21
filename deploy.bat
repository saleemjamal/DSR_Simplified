@echo off
REM Production Deployment Script for Poppat Jamals DSR (Windows)
REM This script automates the deployment process to Vercel

setlocal enabledelayedexpansion

echo.
echo ================================================================
echo 🏢 Poppat Jamals DSR - Production Deployment (Windows)
echo ================================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ and try again.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed. Please install npm and try again.
    pause
    exit /b 1
)

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Vercel CLI not found. Installing...
    npm install -g vercel
    if errorlevel 1 (
        echo [ERROR] Failed to install Vercel CLI
        pause
        exit /b 1
    )
)

echo [INFO] All dependencies are available
echo.

REM Install project dependencies
echo [INFO] Installing project dependencies...

REM Install root dependencies
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)

REM Install backend dependencies
echo [INFO] Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

REM Install frontend dependencies
echo [INFO] Installing frontend dependencies...
cd web
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
cd ..

echo [SUCCESS] Dependencies installed successfully
echo.

REM Run linting (optional, continue on failure)
echo [INFO] Running code linting...

echo [INFO] Linting backend...
cd backend
call npm run lint
cd ..

echo [INFO] Linting frontend...
cd web
call npm run lint
cd ..

echo [INFO] Linting completed
echo.

REM Run tests (optional, continue on failure)
echo [INFO] Running tests...

echo [INFO] Running backend tests...
cd backend
call npm test
cd ..

echo [INFO] Running frontend tests...
cd web
call npm test
cd ..

echo [INFO] Tests completed
echo.

REM Build the application
echo [INFO] Building application for production...
cd web
call npm run build:production
if errorlevel 1 (
    echo [ERROR] Failed to build application
    pause
    exit /b 1
)
cd ..

echo [SUCCESS] Application built successfully
echo.

REM Check if user is logged in to Vercel
echo [INFO] Checking Vercel authentication...
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo [INFO] Please log in to Vercel...
    vercel login
    if errorlevel 1 (
        echo [ERROR] Failed to log in to Vercel
        pause
        exit /b 1
    )
)

REM Deploy to Vercel
echo [INFO] Deploying to Vercel...
vercel --prod
if errorlevel 1 (
    echo [ERROR] Deployment failed
    pause
    exit /b 1
)

echo.
echo [SUCCESS] 🎉 Deployment Complete!
echo.
echo Your application has been deployed to Vercel.
echo.
echo Next steps:
echo 1. Check the Vercel dashboard for your deployment URL
echo 2. Configure your custom domain (if applicable)
echo 3. Test all application features
echo 4. Update Google OAuth redirect URIs with the new domain
echo.
echo Important notes:
echo - Verify all environment variables are set in Vercel dashboard
echo - Ensure database connections are working
echo - Test Google SSO functionality
echo.
echo For troubleshooting, see PRODUCTION_DEPLOYMENT.md
echo.
echo [SUCCESS] ✅ Deployment process completed successfully!
echo.

pause