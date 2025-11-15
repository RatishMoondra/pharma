# Start Backend Server
# This script activates the virtual environment and starts the FastAPI backend server

Write-Host "Starting Backend Server..." -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Navigate to backend directory
Set-Location -Path "$PSScriptRoot\..\backend"

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Start uvicorn server
Write-Host "Starting uvicorn server on http://localhost:8000..." -ForegroundColor Yellow
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
