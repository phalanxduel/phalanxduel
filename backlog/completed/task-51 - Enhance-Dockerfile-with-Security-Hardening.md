---
id: TASK-51
title: Enhance Dockerfile with Security Hardening
status: Done
assignee:
  - '@gordon'
created_date: ''
updated_date: '2026-03-17 21:17'
labels:
  - security
  - dockerfile
  - production
dependencies: []
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add comprehensive security hardening to the Dockerfile including non-root user execution, graceful shutdown enablement, strict peer dependency checking, and BuildKit cache optimization. This is the foundation for all subsequent security improvements.
<!-- SECTION:DESCRIPTION:END -->

# TASK-51: Enhance Dockerfile with Security Hardening

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Non-root USER (nodejs:1001) created in runtime stage with proper permissions
- [ ] #2 All COPY commands in runtime stage use `--chown=nodejs:nodejs`
- [ ] #3 `pnpm install --prod` includes `--strict-peer-dependencies` flag
- [ ] #4 BuildKit cache mounts configured: `--mount=type=cache,target=/root/.pnpm-store`
- [ ] #5 Dockerfile comments document OTLP/environment variables clearly
- [ ] #6 Image builds successfully without warnings
- [ ] #7 `docker run phalanxduel:secure id` returns uid=1001
- [ ] #8 `docker history phalanxduel:secure` shows no .env or secret files
- [ ] #9 Multi-architecture support: `docker buildx build --platform linux/amd64,linux/arm64` succeeds
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Changes to Dockerfile

**Stage 1 (deps)**:
```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/

RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile
```

**Stage 2 (build)**:
```dockerfile
FROM node:24-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/engine/node_modules ./engine/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY . .

# Build args documented
ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

RUN --mount=type=cache,target=/root/.pnpm-store \
    SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN 2>/dev/null || true) \
    pnpm build

RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN 2>/dev/null || true) && \
    if [ -n "$SENTRY_AUTH_TOKEN" ]; then \
      npx @sentry/cli sourcemaps inject ./server/dist && \
      npx @sentry/cli sourcemaps upload ./server/dist \
        --org mike-hall \
        --project phalanxduel; \
    else \
      echo "SENTRY_AUTH_TOKEN not available, skipping server sourcemap upload"; \
    fi
```

**Stage 3 (runtime)** — HARDENED:
```dockerfile
FROM node:24-alpine AS runtime
WORKDIR /app

# Security: Create non-root user before copying files
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nodejs

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

# Workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/

# Security: Strict peer dependency checking
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile --prod --ignore-scripts --strict-peer-dependencies

# Security: Copy with explicit ownership
COPY --from=build --chown=nodejs:nodejs /app/shared/dist/ shared/dist/
COPY --from=build --chown=nodejs:nodejs /app/engine/dist/ engine/dist/
COPY --from=build --chown=nodejs:nodejs /app/server/dist/ server/dist/
COPY --from=build --chown=nodejs:nodejs /app/client/dist/ client/dist/
COPY --from=build --chown=nodejs:nodejs /app/server/drizzle/ server/drizzle/

# Environment setup
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# OTLP Configuration — can be overridden at runtime
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
ENV OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
ENV OTEL_SERVICE_NAME=phalanxduel

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Security: Switch to non-root user before CMD
USER nodejs

CMD ["node", "server/dist/index.js"]
```

### Update .dockerignore

Add comprehensive exclusions to reduce build context and improve cache hit rates:

```text
# Dependencies
node_modules
*/node_modules
**/node_modules

# Build artifacts
dist
*/dist

# Source files (not needed in runtime image)
*/src
scripts/
bin/
admin/src/
client/src/
engine/src/
shared/src/

# Development & documentation
docs/
backlog/
artifacts/
logs/
tmp/
coverage/
.nyc_output/

# Test files
*.test.ts
*.spec.ts
.vitest/
.playwright/

# Configuration & metadata
.git
.gitignore
.github/
.husky/
.vscode/
.idea/
*.log

# Secrets
.env
.env.*
!.env.example

# License/changelog
LICENSE*
LICENSE-ASSETS
COPYING
CHANGELOG.md
AGENTS.md
GLOSSARY.md

# OS
.DS_Store
Thumbs.db
```
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- **Security First**: Non-root user implementation is critical; verify file permissions don't break app startup
- **Graceful Shutdown**: Dockerfile CMD doesn't handle signals; add SIGTERM handler to Node.js app (separate task TASK-53)
- **BuildKit**: Cache mounts only work with `DOCKER_BUILDKIT=1` or `docker buildx build`; CI will enable this
- **Multi-arch**: Use `docker buildx build --platform linux/amd64,linux/arm64` to test; may require QEMU emulation

## Verification Steps

```bash
# 1. Build image
DOCKER_BUILDKIT=1 docker build -t phalanxduel:secure .

# 2. Verify non-root user
docker run --rm phalanxduel:secure id
# Expected: uid=1001(nodejs) gid=1001(nodejs) groups=1001(nodejs)

# 3. Verify no secrets in layers
docker history phalanxduel:secure | grep -i 'sentry\|secret\|env'
# Expected: No matches

# 4. Verify image size and layers
docker image inspect phalanxduel:secure --format='{{.Size}}'
# Expected: ~200–300MB

# 5. Test startup
docker run --rm -d --name phalanx-test phalanxduel:secure
sleep 5
docker inspect phalanx-test --format='{{json .State}}'
# Expected: "Running": true

docker stop phalanx-test

# 6. Multi-arch (optional, requires QEMU)
docker buildx build --platform linux/amd64,linux/arm64 -t phalanxduel:secure .
```

## Risk Assessment

**Risk Level**: Low

- **Security**: Non-root implementation is defensive; no functionality changes
- **Regression**: Verify file I/O paths don't break with different user permissions
- **Build Time**: BuildKit cache may add complexity; mitigated by good `.dockerignore`

## Dependencies

- Current Dockerfile (source of truth)
- pnpm 10.30.3 (already pinned)
- Docker Buildx (or Docker Desktop with BuildKit enabled)

## Related Tasks

- TASK-53: Add Graceful Shutdown Handler (depends on this)
- TASK-55: Implement Docker Security Scanning in CI (validates this)
- TASK-61: Update Fly.io Configuration (uses this hardened image)

---

**Effort Estimate**: 3 hours  
**Priority**: CRITICAL (Security blocking)  
**Complexity**: Medium (Dockerfile expertise required; careful permission handling)
<!-- SECTION:NOTES:END -->
