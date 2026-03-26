#!/bin/sh
set -e

echo "=== RelancePro Africa - Starting ==="

# Run database setup (push schema to database)
echo "Setting up database schema..."
cd /app
npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || npx prisma migrate deploy || echo "Database already synced"

# Start the application
echo "Starting application..."
exec node server.js
