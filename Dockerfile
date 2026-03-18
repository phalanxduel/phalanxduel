# ── Stage 1: Install dependencies ──────────────────────────────────
FROM node:25-alpine AS deps
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
FROM node:25-alpine AS build
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
FROM node:25-alpine AS runtime
WORKDIR /app

# Security: Create non-root user before copying files
# Prevents container escape exploits by limiting privilege escalation surface
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nodejs

# Install pnpm via npm
RUN npm install -g pnpm@10.30.3

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/

# Install production deps only; --ignore-scripts skips lifecycle hooks (e.g. husky prepare)
# which reference devDependencies not present in a prod install
# --strict-peer-dependencies ensures no dependency conflicts
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile --prod --ignore-scripts --strict-peer-dependencies

# Security: Copy with explicit ownership to non-root user
COPY --from=build --chown=nodejs:nodejs /app/shared/dist/ shared/dist/
COPY --from=build --chown=nodejs:nodejs /app/engine/dist/ engine/dist/
COPY --from=build --chown=nodejs:nodejs /app/server/dist/ server/dist/
COPY --from=build --chown=nodejs:nodejs /app/client/dist/ client/dist/

# Copy migration files for release_command
COPY --from=build --chown=nodejs:nodejs /app/server/drizzle/ server/drizzle/

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# OTEL Configuration — can be overridden at runtime
# These defaults enable OpenTelemetry tracing to local collector
# Override with environment variables for production/staging:
#   OTEL_EXPORTER_OTLP_ENDPOINT=http://sentry.local:4318
#   OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
ENV OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
ENV OTEL_SERVICE_NAME=phalanxduel-server
ENV OTEL_SERVICE_VERSION=unknown

EXPOSE 3001

# Health check: Liveness probe (is process alive?)
# Grace period: 15s (allows app startup)
# Interval: 30s (check every 30s)
# Timeout: 5s (fail if no response within 5s)
# Retries: 3 (mark unhealthy after 3 consecutive failures)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Security: Run as non-root user (uid=1001, gid=1001)
USER nodejs

# Graceful shutdown:
# - The app listens for SIGTERM and closes connections gracefully (30s timeout)
# - Orchestrators should set --stop-signal=SIGTERM and timeout=35s (30s grace + 5s buffer)
# - See server/src/index.ts for signal handler implementation
STOPSIGNAL SIGTERM

CMD ["node", "server/dist/index.js"]
