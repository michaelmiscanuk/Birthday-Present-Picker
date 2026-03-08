@echo off
echo Installing dependencies...
call npm install
echo.
echo Starting dev server at http://localhost:3000
echo Press Ctrl+C to stop.
echo.
call npx next dev
