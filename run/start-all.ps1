# Start Both Backend and Frontend Servers
# This script starts both the backend (FastAPI) and frontend (Vite) servers in separate windows

Write-Host "Starting Pharmaceutical System..." -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# Get the script directory
$scriptDir = $PSScriptRoot

# Start Backend in new PowerShell window
Write-Host "Launching Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-File", "$scriptDir\start-backend.ps1"

# Wait a moment before starting frontend
Start-Sleep -Seconds 2

# Start Frontend in new PowerShell window
Write-Host "Launching Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-File", "$scriptDir\start-frontend.ps1"

Write-Host ""
Write-Host "Both servers are starting in separate windows!" -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop the servers" -ForegroundColor Yellow
