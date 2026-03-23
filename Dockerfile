# RelancePro Africa - Production Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM node:25-alpine AS deps
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    openssl-dev \
    python3 \
    make \
    g++

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --include=dev && \
    npx prisma generate

# Stage 2: Builder
FROM node:25-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build arguments for version info
ARG NEXT_PUBLIC_APP_VERSION=latest
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION

# Generate Prisma client and build
RUN npx prisma generate && \
    npm run build

# Stage 3: Runner (Production)
FROM node:25-alpine AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install runtime dependencies
RUN apk add --no-cache \
    openssl \
    curl \
    dumb-init

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Copy health check script
COPY scripts/health-check.sh /usr/local/bin/health-check.sh
RUN chmod +x /usr/local/bin/health-check.sh

# Set correct ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set port
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Labels for container metadata
LABEL maintainer="RelancePro Africa <support@relancepro.africa>"
LABEL org.opencontainers.image.title="RelancePro Africa"
LABEL org.opencontainers.image.description="Debt collection management platform for African businesses"
LABEL org.opencontainers.image.vendor="RelancePro Africa"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/relancepro/relancepro-africa"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
