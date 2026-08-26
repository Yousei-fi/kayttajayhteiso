#!/bin/sh
set -e

mkdir -p "$(dirname "${DATABASE_URL#file:}")" 2>/dev/null || true

echo "Running database migrations..."
npx prisma migrate deploy

# Real reference content (service directory, NA meetings) — always kept in
# sync, on every boot, regardless of SEED_DEMO_DATA. This is not demo data.
echo "Syncing reference data (service directory, NA meetings)..."
npx tsx prisma/seed-reference.ts

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  echo "Seeding demo data (SEED_DEMO_DATA=true)..."
  npx tsx prisma/seed.ts || true
fi

exec "$@"
