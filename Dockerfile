# ── Stage 1: Install dependencies ──────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build everything ─────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/engine/node_modules ./engine/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY . .

# Pass Sentry config as build args for client compilation
ARG VITE_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

# Build client (produces client/dist/)
RUN pnpm --filter @phalanx/client build

# ── Stage 3: Production runtime ───────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy source (server runs via tsx from source)
COPY shared/src/ shared/src/
COPY engine/src/ engine/src/
COPY server/src/ server/src/

# Copy built client assets
COPY --from=build /app/client/dist/ client/dist/

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["pnpm", "--filter", "@phalanx/server", "start"]
