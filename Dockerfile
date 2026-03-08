# ── Stage 1: Install dependencies ──────────────────────────────────
FROM node:24.14.0-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate


COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build everything ─────────────────────────────────────
FROM node:24.14.0-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/engine/node_modules ./engine/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY . .

# Pass Sentry DSN as build arg for client compilation
ARG VITE_SENTRY__CLIENT__SENTRY_DSN
ENV VITE_SENTRY__CLIENT__SENTRY_DSN=$VITE_SENTRY__CLIENT__SENTRY_DSN

# Build all workspace packages; mount Sentry auth token as build secret
# so it's available for client source map upload (via Vite plugin) but
# never persisted in a Docker layer
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) \
    pnpm build

# Upload server source maps to Sentry for error debugging
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) && \
    npx @sentry/cli sourcemaps inject ./server/dist && \
    npx @sentry/cli sourcemaps upload ./server/dist \
      --org mike-hall \
      --project phalanxduel-server

# ── Stage 3: Production runtime ───────────────────────────────────
FROM node:24.14.0-alpine AS runtime
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate


# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/

# Install production deps only; --ignore-scripts skips lifecycle hooks (e.g. husky prepare)
# which reference devDependencies not present in a prod install
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built artifacts
COPY --from=build /app/shared/dist/ shared/dist/
COPY --from=build /app/engine/dist/ engine/dist/
COPY --from=build /app/server/dist/ server/dist/
COPY --from=build /app/client/dist/ client/dist/

# Copy migration files for release_command
COPY --from=build /app/server/drizzle/ server/drizzle/

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "server/dist/index.js"]
