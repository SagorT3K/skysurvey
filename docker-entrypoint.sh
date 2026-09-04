#!/bin/sh
# Prepares the volume-backed SQLite database, then starts the app.
#
# This runs on every container start because Fly release commands execute without
# volumes attached, so /data only exists here. Both steps are idempotent.
set -e

mkdir -p /data

echo "==> Applying Prisma schema to $DATABASE_URL"
npx prisma db push --skip-generate

# Seed only an empty database, so a restart never overwrites live data.
NEEDS_SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count()
  .then((n) => { process.stdout.write(n === 0 ? 'yes' : 'no'); })
  .catch(() => { process.stdout.write('yes'); })
  .finally(() => p.\$disconnect());
")

if [ "$NEEDS_SEED" = "yes" ]; then
  echo "==> Empty database, seeding config, admin and demo surveys"
  node prisma/seed.js
else
  echo "==> Database already populated, skipping seed"
fi

exec "$@"
