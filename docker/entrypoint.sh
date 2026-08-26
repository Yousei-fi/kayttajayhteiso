#!/bin/sh
set -e

mkdir -p "$(dirname "${DATABASE_URL#file:}")" 2>/dev/null || true

echo "Running database migrations..."
npx prisma migrate deploy

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  echo "Seeding demo data (SEED_DEMO_DATA=true)..."
  npx tsx prisma/seed.ts || true
fi

exec "$@"
