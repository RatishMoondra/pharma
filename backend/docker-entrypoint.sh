#!/bin/sh
set -e

echo "🚀 Starting backend container..."

# ---------------------------------------------
# Wait for Postgres
# ---------------------------------------------
echo "⏳ Waiting for Postgres to be ready..."
until pg_isready -h db -p 5432 -U "${POSTGRES_USER}" >/dev/null 2>&1; do
  sleep 1
done
echo "✔ Postgres is ready."

# ---------------------------------------------
# Run Alembic migrations
# ---------------------------------------------
if [ -f "./alembic.ini" ]; then
  echo "⚙️  Running Alembic migrations..."
  alembic -c alembic.ini upgrade head
else
  echo "⚠️  alembic.ini not found — skipping migrations."
fi

# ---------------------------------------------
# Run SQL seed file (optional)
# ---------------------------------------------
SEED_FILE="/usr/src/app/database/seeds_gpt.sql"
SEED_MARKER="/var/lib/postgresql/data/.seeded"

# Run seed only once
if [ -f "$SEED_FILE" ]; then
  if [ ! -f "$SEED_MARKER" ]; then
    echo "🌱 First-time database setup — running seeds_gpt.sql"
    psql "$DATABASE_URL" -f "$SEED_FILE" && touch "$SEED_MARKER"
    echo "✔ Seed completed and marker created."
  else
    echo "ℹ️ seeds_gpt.sql already applied — skipping."
  fi
else
  echo "ℹ️ No seeds_gpt.sql file found. Skipping seed."
fi

# ---------------------------------------------
# Start the application via Gunicorn
# ---------------------------------------------
echo "🚀 Starting Gunicorn..."
exec gunicorn -k uvicorn.workers.UvicornWorker \
  -w 4 \
  -b 0.0.0.0:8000 \
  app.main:app
