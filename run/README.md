# Run Scripts

This folder contains PowerShell scripts to easily start the pharmaceutical system servers.

## Scripts

### `start-backend.ps1`
Starts the FastAPI backend server on port 8000.
- Activates the Python virtual environment
- Runs uvicorn with auto-reload enabled
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### `start-frontend.ps1`
Starts the Vite development server on port 5173.
- Runs the React frontend with hot module replacement
- Frontend UI: http://localhost:5173

### `start-all.ps1` ⭐ **Recommended**
Starts both backend and frontend servers in separate PowerShell windows.
- Launches backend in one window
- Launches frontend in another window
- Most convenient way to start the entire system

## Usage

### Option 1: Start Everything (Recommended)
```powershell
.\run\start-all.ps1
```

### Option 2: Start Individually
```powershell
# Start backend only
.\run\start-backend.ps1

# Start frontend only (in another terminal)
.\run\start-frontend.ps1
```

### Option 3: From the run directory
```powershell
cd run
.\start-all.ps1
```

## Prerequisites

- Backend virtual environment must be set up at `backend/venv`
- Node modules must be installed in `frontend/node_modules`
- PostgreSQL database must be running

## Stopping the Servers

Press `Ctrl+C` in each PowerShell window to stop the respective server.

## Troubleshooting

**Backend won't start:**
- Check if Python virtual environment exists: `backend/venv`
- Verify database connection in `backend/app/config.py`
- Check if port 8000 is already in use

**Frontend won't start:**
- Run `npm install` in the frontend directory
- Check if port 5173 is already in use
- Verify `frontend/package.json` exists

**Permission Error:**
If you get "execution of scripts is disabled", run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
