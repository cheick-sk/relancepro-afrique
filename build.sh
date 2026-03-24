#!/bin/bash

# Clean up
rm -rf .next
rm -rf node_modules/.cache

# Set resource limits
export UV_THREADPOOL_SIZE=1
export NODE_OPTIONS="--max-old-space-size=2048 --max-semi-space-size=64"
export NEXT_BUILD_WORKERS=1

# Generate Prisma client
npx prisma generate

# Build with minimal workers
npx next build --no-lint
