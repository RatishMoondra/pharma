# backend/Dockerfile

FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy requirements FIRST (for Docker caching)
COPY requirements.txt /usr/src/app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the ENTIRE backend folder into the container
# Because build context = ./backend
COPY . /usr/src/app/

# Make sure entrypoint is executable
RUN chmod +x docker-entrypoint.sh

# (Optional) Use non-root user — remove if causing permission issues
# RUN useradd --create-home appuser && chown -R appuser:appuser /usr/src/app
# USER appuser

# Expose backend port
EXPOSE 8000

# Default command (Gunicorn)
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-w", "4", "-b", "0.0.0.0:8000", "app.main:app"]
