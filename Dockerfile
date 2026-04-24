# ── Stage 0: Download OTel Collector (using official Docker image as source) ──────
FROM otel/opentelemetry-collector-contrib:0.100.0 AS otel-collector-base

# ── Stage 1: Install build dependencies ─────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

# Install pnpm via npm
RUN npm install -g pnpm@10.30.3

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/
COPY admin/package.json admin/

# BuildKit cache mount: persists pnpm store across builds
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

# Build all workspace packages
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm build

# ── Stage 3: Prepare production dependencies ──────────────────────
FROM node:24-alpine AS prod-deps
WORKDIR /app

RUN npm install -g pnpm@10.30.3

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/
COPY admin/package.json admin/

# Install ONLY production dependencies, ignoring scripts
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile --prod --ignore-scripts --strict-peer-dependencies

# ── Stage 4: Production runtime ───────────────────────────────────
FROM node:24-alpine AS runtime
WORKDIR /app

# Security: Use a non-root user
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nodejs

# Copy OTel Collector binary
COPY --from=otel-collector-base --chown=nodejs:nodejs --chmod=755 /otelcol-contrib /app/otel-collector/otelcol-contrib

# Copy production node_modules from prod-deps stage
# pnpm uses symlinks across workspace packages — all must be present for resolution
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nodejs:nodejs /app/shared/node_modules ./shared/node_modules
COPY --from=prod-deps --chown=nodejs:nodejs /app/engine/node_modules ./engine/node_modules
COPY --from=prod-deps --chown=nodejs:nodejs /app/server/node_modules ./server/node_modules
COPY --from=prod-deps --chown=nodejs:nodejs /app/client/node_modules ./client/node_modules
COPY --from=prod-deps --chown=nodejs:nodejs /app/admin/node_modules ./admin/node_modules

# Copy compiled artifacts and database migrations
COPY --from=build --chown=nodejs:nodejs /app/shared/dist ./shared/dist
COPY --from=build --chown=nodejs:nodejs /app/engine/dist ./engine/dist
COPY --from=build --chown=nodejs:nodejs /app/server/dist ./server/dist
COPY --from=build --chown=nodejs:nodejs /app/client/dist ./client/dist
COPY --from=build --chown=nodejs:nodejs /app/admin/dist ./admin/dist
COPY --from=build --chown=nodejs:nodejs /app/server/migrations ./server/migrations

# Copy workspace package.json files (pnpm symlinks resolve to these)
COPY --chown=nodejs:nodejs shared/package.json ./shared/package.json
COPY --chown=nodejs:nodejs engine/package.json ./engine/package.json
COPY --chown=nodejs:nodejs server/package.json ./server/package.json
COPY --chown=nodejs:nodejs client/package.json ./client/package.json
COPY --chown=nodejs:nodejs admin/package.json ./admin/package.json

# Copy config and other required files
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=nodejs:nodejs otel-collector.fly.yaml ./otel-collector.fly.yaml

# Switch to non-root user
USER nodejs

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# OTEL Configuration
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
ENV OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
ENV OTEL_SERVICE_NAME=phx-server
ENV OTEL_SERVICE_VERSION=unknown

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health > /dev/null 2>&1 || exit 1

STOPSIGNAL SIGTERM

CMD ["node", "server/dist/index.js"]
