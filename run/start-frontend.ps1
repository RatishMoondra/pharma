# Start Frontend Development Server
# This script starts the Vite development server for the React frontend

Write-Host "Starting Frontend Development Server..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Navigate to frontend directory
Set-Location -Path "$PSScriptRoot\..\frontend"

# Start Vite dev server
Write-Host "Starting Vite dev server on http://localhost:5173..." -ForegroundColor Yellow
npm run dev
