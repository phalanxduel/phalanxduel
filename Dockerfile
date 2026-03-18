# ── Stage 0: Download OTel Collector (using official Docker image as source) ──────
FROM otel/opentelemetry-collector-contrib:0.100.0 AS otel-collector-base

# ── Stage 1: Install dependencies ──────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

# Install pnpm via npm (corepack may not be available in all Alpine environments)
RUN npm install -g pnpm@10.30.3

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/
COPY admin/package.json admin/

# BuildKit cache mount: persists pnpm store across builds (40-60% faster rebuilds)
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# ── Stage 2: Build everything ─────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

# Install pnpm via npm
RUN npm install -g pnpm@10.30.3

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/engine/node_modules ./engine/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY --from=deps /app/admin/node_modules ./admin/node_modules
COPY . .

# Pass Sentry DSN as build arg for client compilation
ARG VITE_SENTRY__CLIENT__SENTRY_DSN
ENV VITE_SENTRY__CLIENT__SENTRY_DSN=$VITE_SENTRY__CLIENT__SENTRY_DSN

# Build all workspace packages; mount Sentry auth token as build secret
# so it's available for client source map upload (via Vite plugin) but
# never persisted in a Docker layer
RUN --mount=type=cache,target=/root/.pnpm-store \
    --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN 2>/dev/null || true) \
    pnpm build

# Upload server source maps to Sentry for error debugging (non-fatal)
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN 2>/dev/null || true) && \
    if [ -n "$SENTRY_AUTH_TOKEN" ]; then \
      npx @sentry/cli sourcemaps inject ./server/dist && \
      npx @sentry/cli sourcemaps upload ./server/dist \
        --org mike-hall \
        --project phalanxduel-server; \
    else \
      echo "SENTRY_AUTH_TOKEN not available, skipping server sourcemap upload"; \
    fi

# ── Stage 3: Production runtime ───────────────────────────────────
FROM node:24-alpine AS runtime
WORKDIR /app

# Copy OTel Collector binary from official image
COPY --from=otel-collector-base /otelcol-contrib /app/otel-collector/otelcol-contrib
RUN chmod +x /app/otel-collector/otelcol-contrib

# Security: Create non-root user early
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nodejs

# Install pnpm via npm (still as root for global install)
RUN npm install -g pnpm@10.30.3

# Setup app directory permissions (including otel-collector dir)
RUN chown -R nodejs:nodejs /app

# Switch to non-root user for all subsequent steps
USER nodejs

# Copy workspace config with correct ownership
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=nodejs:nodejs shared/package.json shared/
COPY --chown=nodejs:nodejs engine/package.json engine/
COPY --chown=nodejs:nodejs server/package.json server/
COPY --chown=nodejs:nodejs client/package.json client/
COPY --chown=nodejs:nodejs admin/package.json admin/

# Install production deps as nodejs user
# We use a user-local cache target to avoid permission issues with /root
RUN --mount=type=cache,target=/home/nodejs/.pnpm-store,uid=1001 \
    pnpm install --frozen-lockfile --prod --ignore-scripts --strict-peer-dependencies

# Security: Copy compiled artifacts with explicit ownership
COPY --from=build --chown=nodejs:nodejs /app/shared/dist/ shared/dist/
COPY --from=build --chown=nodejs:nodejs /app/engine/dist/ engine/dist/
COPY --from=build --chown=nodejs:nodejs /app/server/dist/ server/dist/
COPY --from=build --chown=nodejs:nodejs /app/client/dist/ client/dist/

# Copy migration files for release_command
COPY --from=build --chown=nodejs:nodejs /app/server/drizzle/ server/drizzle/

# Copy OTel Collector configuration
COPY --chown=nodejs:nodejs otel-collector-config.yaml /app/otel-collector-config.yaml

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# OTEL Configuration
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
ENV OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
ENV OTEL_SERVICE_NAME=phalanxduel-server
ENV OTEL_SERVICE_VERSION=unknown

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health > /dev/null 2>&1 || exit 1

STOPSIGNAL SIGTERM

CMD ["node", "server/dist/index.js"]
