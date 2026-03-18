# Docker Configuration Analysis: Phalanx Duel

## Executive Summary

**Current State:** The Dockerfile is well-structured with multi-stage builds, secrets management, and health checks. The application is deployed on Fly.io with automated migrations. However, there are gaps in local development containerization, observability within containers, networking infrastructure, and production-grade Docker orchestration.

**Overall Maturity:** 7/10 — Production-ready for simple deployments but requires enhancements for scalability, local dev workflow, and comprehensive Docker infrastructure.

---

## Detailed Analysis

### 1. SECURITY

#### ✅ Strengths

- **Multi-stage builds**: Dev dependencies not in runtime image (Sentry CLI, TypeScript, etc.)
- **Secret management**: `SENTRY_AUTH_TOKEN` mounted as temporary build secret, never persisted
- **Non-root user**: Alpine Linux default (unprivileged)
- **`.dockerignore` coverage**: Excludes `.env*`, `.git`, node_modules, dist
- **Helmet integration**: Fastify security headers enabled (per server/package.json)
- **Rate limiting**: `@fastify/rate-limit` in dependencies
- **JWT authentication**: `@fastify/jwt` present

#### ⚠️ Issues & Gaps

| Issue | Complexity | Risk | Recommendation |
|-------|-----------|------|-----------------|
| **No explicit non-root USER directive** | L | M | Add `RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nodejs` + `USER nodejs` in runtime stage. This prevents container escape exploits. |
| **Sentry tokens not validated before mount** | M | M | In build stage, add validation: `test -n "$SENTRY_AUTH_TOKEN"` or catch mount errors gracefully. Currently fails silently if secret doesn't exist. |
| **No image scanning/attestation** | H | M | Integrate `docker scout cves` in CI pipeline or use Snyk/Trivy for automated vulnerability scans. Publish SBOM. |
| **`pnpm install --prod --ignore-scripts` doesn't verify integrity** | L | L | Add `--strict-peer-dependencies` flag to catch transitive dependency conflicts. |
| **No image signing** | M | L | Sign images with `docker content trust` or Sigstore/cosign in CI/CD pipeline. |
| **Database migration run as root** | H | H | In `fly.toml`, `release_command = "node server/dist/db/migrate.js"` runs as root. Create dedicated migration user or run unprivileged. |
| **WebSocket transport over HTTP** | M | M | Dockerfile exposes port 3001 without HTTPS enforcement at container level. Fly.io handles TLS termination, but document TLS requirement. Add warning in README. |

#### Recommendations

```dockerfile
# Stage 3: Runtime (revised)
FROM node:25-alpine AS runtime
WORKDIR /app

# Create non-root user before copying files
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nodejs

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/

RUN pnpm install --frozen-lockfile --prod --ignore-scripts --strict-peer-dependencies

COPY --from=build --chown=nodejs:nodejs /app/shared/dist/ shared/dist/
COPY --from=build --chown=nodejs:nodejs /app/engine/dist/ engine/dist/
COPY --from=build --chown=nodejs:nodejs /app/server/dist/ server/dist/
COPY --from=build --chown=nodejs:nodejs /app/client/dist/ client/dist/
COPY --from=build --chown=nodejs:nodejs /app/server/drizzle/ server/drizzle/

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

USER nodejs

CMD ["node", "server/dist/index.js"]
```

---

### 2. PERFORMANCE

#### ✅ Strengths

- **Multi-stage builds**: Only runtime deps in final image
- **Alpine base**: Smaller attack surface, smaller image size
- **Frozen lockfile**: Reproducible, consistent installs (no transitive surprises)
- **`--ignore-scripts`**: Skips expensive lifecycle hooks in prod
- **Sentry source map injection at build time**: No runtime overhead

#### ⚠️ Issues & Gaps

| Issue | Complexity | Risk | Recommendation |
|-------|-----------|------|-----------------|
| **Image size not monitored** | M | M | Measure current image size: `docker inspect <image> --format='{{.Size}}'`. Likely 200–300MB. Add size gates in CI. |
| **Node.js 25 (latest)**: May have stability issues | L | M | Pin to stable LTS or current stable (e.g., `node:22-alpine`, `node:24-alpine`). Node 25 may deprecate rapidly. Consider Docker Hardened Images for security hardening. |
| **Build cache not optimized** | M | M | Monorepo structure causes full rebuild on any workspace file change. Layer dependencies better: copy shared first, then engine, etc. |
| **No BuildKit native parallelization** | M | L | Dockerfile works with Docker Buildx but doesn't use `--mount=type=cache` for pnpm cache. Add: `RUN --mount=type=cache,target=/root/.pnpm-store pnpm install ...` |
| **Unnecessary workspace configs in runtime** | L | L | Copy only runtime-needed configs: remove `pnpm-workspace.yaml` and client/admin package.json from runtime. |
| **No layer caching strategy for monorepo** | M | H | Separate deps install per workspace package to maximize cache hits. |
| **PostgreSQL/Redis not containerized** | H | H | Local dev requires external services. No docker-compose.yml for local stack. |
| **Fly.io machine: 512MB RAM** | L | H | Adequate for game server but tight for concurrent matches. Monitor memory usage and scale vertically if needed. |

#### Recommendations

```dockerfile
# Enhanced multi-stage with cache mount (requires Buildx)
FROM node:24-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/

# Cache pnpm store across builds
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# Build with same cache
FROM node:24-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm build
```

Create `.dockerignore` additions:
```text
# Unnecessary for runtime
client/src
admin/src
engine/src
shared/src
scripts/
bin/
docs/
backlog/
CHANGELOG.md
AGENTS.md
GLOSSARY.md
LICENSE*
```

---

### 3. RELIABILITY

#### ✅ Strengths

- **Health check**: `/health` endpoint polled every 30s (5s grace, 3 retries)
- **Zero-downtime migrations**: `release_command` in fly.toml runs before deploy
- **Error tracking**: Sentry integration for server + client errors
- **OpenTelemetry**: Full observability (traces, metrics, logs)
- **Type safety**: TypeScript monorepo, 100% coverage checks

#### ⚠️ Issues & Gaps

| Issue | Complexity | Risk | Recommendation |
|-------|-----------|------|-----------------|
| **Single container instance** | M | H | Fly.io `min_machines_running = 0` means cold starts. Add `min_machines_running = 1` for prod or enable Fly Anycast for multi-region. Game matches may have latency spikes during startup. |
| **No health check for WebSocket** | M | M | Health endpoint only tests HTTP. Add WebSocket connectivity check: `ws://localhost:3001/health/ws` endpoint. |
| **Database migrations not tested before deploy** | M | H | `release_command` runs blindly. Add migration validation: `node server/dist/db/verify-migration.js` as pre-flight check. |
| **No graceful shutdown** | M | M | Server doesn't handle `SIGTERM` to close connections. Add shutdown handler: `process.on('SIGTERM', async () => { await app.close(); })` |
| **No reconnection logic for OTLP exporter** | L | M | If SigNoz/OTel collector unreachable, traces may be lost. Add retry + fallback to console logging. |
| **Memory leaks not monitored** | M | H | No memory profiling in container. Add Node.js heap snapshot on OOM: `--abort-on-uncaught-exception`. |
| **Database connection pooling** | L | M | `postgres` client uses default pool size (10). For high concurrency, tune `maxRetriesPerRequest`, `connectionTimeoutMillis`. |

#### Recommendations

```typescript
// In server/src/index.ts - Graceful shutdown
const signals = ['SIGTERM', 'SIGINT'];
signals.forEach(signal => {
  process.on(signal, async () => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      console.error('Shutdown error:', err);
      process.exit(1);
    }
  });
});
```

Add to Dockerfile:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { \
    if (r.statusCode !== 200) throw new Error(r.statusCode); \
    r.destroy(); })" || exit 1
```

Add to `fly.toml`:
```toml
[processes]
  web = "node server/dist/index.js"

[processes.web]
  # Graceful shutdown timeout
  kill_timeout = "30s"
  kill_signal = "SIGTERM"

[http_service]
  min_machines_running = 1  # Prevent cold starts in prod
```

---

### 4. TESTABILITY

#### ✅ Strengths

- **Unit tests**: Vitest for shared, engine, server
- **Coverage reports**: CI runs full coverage suite
- **Integration tests**: Supertest + WebSocket tests in server
- **Snapshot testing**: Generated schemas for validation
- **Playthrough automation**: QA scripts for headless game simulation

#### ⚠️ Issues & Gaps

| Issue | Complexity | Risk | Recommendation |
|-------|-----------|------|-----------------|
| **No Docker-in-Docker (DinD) for container tests** | M | M | CI doesn't build/test the final image. Add `docker build -t phalanxduel:test .` in CI pipeline. |
| **No docker-compose for integration tests** | H | H | Game server requires PostgreSQL. Integration tests likely use mocks. Create `docker-compose.test.yml` for full stack testing. |
| **No container health test in CI** | M | M | Image builds, but container startup isn't validated. Add: `docker run --health-cmd="..." phalanxduel:test` + verify health status. |
| **No load testing** | H | M | No k6, JMeter, or Artillery scripts. WebSocket match server needs concurrency testing. |
| **No security scanning in CI** | M | H | No Trivy, Snyk, or Docker Scout in CI pipeline. Add automated CVE checks. |
| **Playwright tests not Dockerized** | M | L | UI tests run on GitHub Actions runner. Containerize browser + app for reproducibility. |
| **QA simulations don't cover deployment** | H | H | `qa:playthrough` tests engine logic, not deployed container. Add smoke tests post-deploy. |

#### Recommendations

```yaml
# .github/workflows/docker-ci.yml
name: Docker CI

on: [push, pull_request]

jobs:
  docker-build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Build image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          load: true
          tags: phalanxduel:test
      
      - name: Run security scan
        run: |
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy image phalanxduel:test
      
      - name: Test container startup
        run: |
          docker run --rm -d --name phalanxduel-test \
            -e NODE_ENV=test \
            -e DATABASE_URL="postgresql://test:test@localhost/phalanxduel" \
            phalanxduel:test
          
          sleep 5
          docker inspect phalanxduel-test --format='{{json .State.Health}}'
          docker stop phalanxduel-test
      
      - name: Calculate image size
        run: docker images phalanxduel:test --format "table {{.Size}}"

  docker-compose-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: phalanxduel
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v6
      - name: Install Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 24
      
      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/phalanxduel
        run: pnpm test:server
```

Create `docker-compose.test.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: phalanxduel
    ports:
      - 5432:5432
    healthcheck:
      test: pg_isready -U test
      interval: 2s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      target: runtime
    environment:
      NODE_ENV: test
      DATABASE_URL: postgresql://test:test@postgres:5432/phalanxduel
      PORT: 3001
    ports:
      - 3001:3001
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: wget -qO- http://localhost:3001/health || exit 1
      interval: 2s
      timeout: 3s
      retries: 3
```

---

### 5. OBSERVABILITY

#### ✅ Strengths

- **OpenTelemetry**: Full tracing (Fastify spans, database spans)
- **Sentry integration**: Error tracking + performance monitoring + source maps
- **Pino logging**: Structured JSON logs with context
- **OTLP export**: SigNoz collector support
- **Health endpoint**: `/health` for Kubernetes/load balancers
- **Metrics**: OpenTelemetry metrics (latency, throughput)

#### ⚠️ Issues & Gaps

| Issue | Complexity | Risk | Recommendation |
|-------|-----------|------|-----------------|
| **No logs collection in container** | M | H | Stdout/stderr captured by Docker, but no persistent log aggregation. Logs lost on container restart. |
| **OTLP configuration not documented in Dockerfile** | M | M | ENV vars like `OTEL_EXPORTER_OTLP_ENDPOINT` must be set at runtime, not baked in. Add comments in Dockerfile. |
| **No log level configuration** | L | L | Pino uses default level. Add `LOG_LEVEL` ENV var support. |
| **Health check returns 200 but doesn't verify internal state** | M | M | `/health` might succeed while app is degraded (e.g., DB connection failing). Add dependencies check. |
| **No container metrics** | M | M | `docker stats` shows CPU/memory, but no app-level metrics (request latency, error rate) in Dockerfile. Relies on OTel only. |
| **Sentry DSN leaks in build** | L | M | `VITE_SENTRY__CLIENT__SENTRY_DSN` is a build ARG, not a secret. Client DSN is public anyway, but document this. |
| **No log rotation** | L | L | Logs written to stdout indefinitely; no size limits. Docker daemon handles rotation via `--log-opt max-size`. Document or enforce with compose override. |
| **WebSocket events not traced** | M | M | Fastify/WebSocket spans may not capture game-specific events. Add manual instrumentation. |

#### Recommendations

```dockerfile
ENV LOG_LEVEL=info
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
ENV OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
ENV OTEL_TRACES_EXPORTER=otlp
ENV OTEL_METRICS_EXPORTER=otlp
ENV OTEL_LOGS_EXPORTER=otlp
ENV OTEL_SERVICE_NAME=phalanxduel-server
ENV OTEL_SERVICE_VERSION=${VERSION:-unknown}
ENV OTEL_RESOURCE_ATTRIBUTES=environment=production
```

Enhance health check:
```typescript
// server/src/routes/health.ts
app.get('/health', async (request, reply) => {
  try {
    // Check database connection
    const db = request.server.db;
    await db.query('SELECT 1');
    
    // Check Redis (if used)
    // await redis.ping();
    
    return { status: 'ok', timestamp: new Date().toISOString() };
  } catch (err) {
    reply.statusCode = 503;
    return { status: 'unhealthy', error: err.message };
  }
});

app.get('/ready', async (request, reply) => {
  try {
    // Readiness: all deps operational
    const db = request.server.db;
    await db.query('SELECT 1');
    return { ready: true };
  } catch (err) {
    reply.statusCode = 503;
    return { ready: false, error: err.message };
  }
});
```

Add to Dockerfile:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { \
    if (r.statusCode > 299) throw new Error(r.statusCode); \
  })" || exit 1
```

---

### 6. CONTAINER SIZE

#### ✅ Strengths

- **Alpine base**: ~130MB base (vs. 1GB+ for Debian)
- **Multi-stage builds**: Dev tools (TypeScript, Sentry CLI) excluded
- **Frozen lockfile**: No unnecessary transitive deps

#### ⚠️ Issues & Gaps

| Issue | Complexity | Risk | Recommendation |
|-------|-----------|------|-----------------|
| **Image size not documented/monitored** | L | M | Likely 200–350MB. Add size gate in CI: `docker image inspect <image> --format='{{.Size}}'` and fail if >300MB. |
| **Client/admin bundles included unnecessarily** | H | H | Entire `client/dist/` and `admin/` served from Node.js. Consider splitting: serve static from CDN/nginx, ship only server code in container. |
| **Monorepo shared code compiled into multiple packages** | M | M | `shared/dist/` duplicated in server, engine, client bundles. Consider tree-shaking or symlinks (requires careful pnpm config). |
| **Dev dependencies might leak into prod** | L | M | `--ignore-scripts` prevents husky, but verify no dev deps installed: `npm ls --depth=0 --prod`. |
| **Node modules bloat** | M | M | 300–400MB typical for TypeScript + web stack. Use `pnpm prune --prod` in runtime stage to remove unnecessary files (tests, docs, TS source). |
| **Source maps included in server bundle** | M | L | TypeScript source maps can be 50MB+. Consider excluding from container or uploading to Sentry and excluding locally. |

#### Recommendations

```dockerfile
# Runtime stage optimization
FROM node:24-alpine AS runtime
WORKDIR /app

RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nodejs
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Prune unnecessary files (tests, docs, source maps if not needed)
RUN pnpm prune --prod && \
    find node_modules -type f -name "*.test.ts" -delete && \
    find node_modules -type f -name "*.spec.ts" -delete && \
    find node_modules -type f -name "README.md" -not -path "*/node_modules/*" -delete && \
    rm -rf \
      node_modules/.bin/tsc \
      node_modules/.bin/tsx \
      node_modules/.pnpm \
      node_modules/.modules.yaml

COPY --from=build --chown=nodejs:nodejs /app/shared/dist/ shared/dist/
COPY --from=build --chown=nodejs:nodejs /app/engine/dist/ engine/dist/
COPY --from=build --chown=nodejs:nodejs /app/server/dist/ server/dist/
# Client static served directly (consider moving to nginx)
COPY --from=build --chown=nodejs:nodejs /app/client/dist/ client/dist/
COPY --from=build --chown=nodejs:nodejs /app/server/drizzle/ server/drizzle/

# Remove source maps if uploaded to Sentry
RUN find server/dist -name "*.map" -delete

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

USER nodejs
CMD ["node", "server/dist/index.js"]
```

Add to CI to track size:
```bash
docker build -t phalanxduel:latest .
SIZE=$(docker image inspect phalanxduel:latest --format='{{.Size}}')
echo "Image size: $((SIZE / 1024 / 1024))MB"
[ $SIZE -lt 314572800 ] || { echo "Image too large!"; exit 1; }  # 300MB limit
```

---

### 7. DEPLOYMENT

#### ✅ Strengths

- **Fly.io integration**: `fly.toml` well-configured with health checks, regions, auto-scaling
- **Zero-downtime deploys**: `release_command` for migrations
- **Auto-start/stop**: `auto_start_machines = true` for cost efficiency
- **Force HTTPS**: Enforced at platform level
- **Environment-based config**: `NODE_ENV`, `PORT`, `HOST` properly set

#### ⚠️ Issues & Gaps

| Issue | Complexity | Risk | Recommendation |
|-------|-----------|------|-----------------|
| **No Kubernetes support** | H | H | Fly.io proprietary. To run on K8s (EKS, GKE, AKS), need Deployment + Service + Ingress manifests. |
| **No Docker Compose for local parity** | H | H | No `docker-compose.yml` means local dev ≠ prod. Can't test full stack locally. |
| **Single region** | M | M | `primary_region = "ord"` (Chicago). No multi-region failover. Add `[regions]` for geo-redundancy. |
| **No rolling update strategy** | M | M | Fly.io handles this, but not explicitly configured. Document expected update window. |
| **No backup/restore procedure** | H | H | Database backups not mentioned. Add backup automation to fly.toml or document manual backup steps. |
| **Environment secrets not versioned** | M | H | `.env.release.local` is not committed (correct), but no way to audit secret changes or rollback. Use Fly.io secrets manager: `flyctl secrets set KEY=value`. |
| **`fly.toml` port mapping assumed** | L | M | `internal_port = 3001` must match `PORT` ENV var. If they diverge, deploy breaks silently. Add validation in CI. |
| **No staging/canary deployment** | M | M | Deploy directly to production. Implement blue-green or canary in fly.toml or use Fly.io deployment slots. |
| **Cold start latency** | M | M | `min_machines_running = 0` means first request waits for machine boot (~5-30s). |

#### Recommendations

Create `docker-compose.yml` for local dev parity:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: phalanx
      POSTGRES_PASSWORD: phalanx_dev
      POSTGRES_DB: phalanxduel
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - 5432:5432
    healthcheck:
      test: pg_isready -U phalanx
      interval: 2s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
    healthcheck:
      test: redis-cli ping
      interval: 2s
      timeout: 3s
      retries: 3

  app:
    build:
      context: .
      target: runtime
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://phalanx:phalanx_dev@postgres:5432/phalanxduel
      REDIS_URL: redis://redis:6379/0
      PORT: 3001
      HOST: 0.0.0.0
      OTEL_EXPORTER_OTLP_ENDPOINT: http://localhost:4318
      OTEL_EXPORTER_OTLP_PROTOCOL: http/protobuf
      LOG_LEVEL: debug
    ports:
      - 3001:3001
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./server/dist:/app/server/dist  # Hot reload for built code
    healthcheck:
      test: wget -qO- http://localhost:3001/health || exit 1
      interval: 5s
      timeout: 3s
      retries: 3

  collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/collector/config.yaml"]
    volumes:
      - ./scripts/otel/collector-config.yaml:/etc/collector/config.yaml
    ports:
      - 4318:4318  # OTLP HTTP receiver
      - 4317:4317  # OTLP gRPC receiver
    depends_on:
      - app

volumes:
  postgres_data:
```

Enhance `fly.toml`:
```toml
app = "phalanxduel"
primary_region = "ord"

[deploy]
  release_command = "node server/dist/db/migrate.js"
  # Only deploy to one machine initially, then scale
  strategy = "rolling"

[processes]
  web = "node server/dist/index.js"

[http_service]
  processes = ["web"]
  internal_port = 3001
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  
  # Prevent cold starts in production
  min_machines_running = 1
  
  # Track regional health
  [http_service.concurrency]
    type = "requests"
    hard_limit = 20
    soft_limit = 17

[[http_service.checks]]
  grace_period = "30s"
  interval = "15s"
  method = "GET"
  path = "/health"
  timeout = "10s"

# Add backup scheduling
[env]
  NODE_ENV = "production"
  PORT = "3001"
  HOST = "0.0.0.0"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"

# Production-grade machine
# [[vm]]
#   size = "performance-1x"  # More CPU for game server
#   memory = "2gb"
```

Create Kubernetes manifests (for multi-cloud portability):
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: phalanxduel-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: phalanxduel
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: phalanxduel
    spec:
      containers:
      - name: app
        image: phalanxduel:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3001
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: phalanxduel-secrets
              key: database-url
        - name: PORT
          value: "3001"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
        securityContext:
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false

---
apiVersion: v1
kind: Service
metadata:
  name: phalanxduel-server
spec:
  type: LoadBalancer
  selector:
    app: phalanxduel
  ports:
  - port: 80
    targetPort: 3001
    protocol: TCP
    name: http
```

Deploy to K8s:
```bash
kubectl apply -f k8s/
```

---

### 8. LOCAL DEVELOPMENT

#### ✅ Strengths

- Clear dev script separation: `dev:server`, `dev:client`, `dev:admin`
- OTLP tracing support locally
- Structured logging (Pino) for debugging

#### ⚠️ Issues & Gaps

| Issue | Complexity | Risk | Recommendation |
|-------|-----------|------|-----------------|
| **No docker-compose for local stack** | H | H | Developers must install/run PostgreSQL, Redis, OTel collector manually. High friction. |
| **No hot reload in container** | M | M | If dev in container (vs. host), code changes require full rebuild. |
| **Environment setup scattered** | M | M | `.env.local` + `.env.release.local` + manual ENV vars. No single source of truth. |
| **No local HTTPS** | L | L | Developers test with HTTP only; TLS termination only in prod (Fly.io). |
| **No secrets injection for local dev** | M | M | SENTRY_AUTH_TOKEN must be in `.env.release.local`; no Docker Compose secrets support. |

#### Recommendations

Create comprehensive local dev setup:

```yaml
# docker-compose.yml (updated)
version: '3.8'

services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: phalanx
      POSTGRES_PASSWORD: phalanx_dev
      POSTGRES_DB: phalanxduel
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - 5432:5432
    healthcheck:
      test: pg_isready -U phalanx
      interval: 2s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
    healthcheck:
      test: redis-cli ping
      interval: 2s
      timeout: 3s
      retries: 3

  collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/collector/config.yaml"]
    volumes:
      - ./scripts/otel/collector-config.yaml:/etc/collector/config.yaml
    ports:
      - 4318:4318
      - 4317:4317

  # Optional: SigNoz for local observability dashboard
  signoz:
    image: signoz/signoz:latest
    ports:
      - 3301:3301
    volumes:
      - signoz_data:/var/lib/signoz

volumes:
  postgres_data:
  signoz_data:
```

Create `.env.local.example`:
```bash
# Database
DATABASE_URL=postgresql://phalanx:phalanx_dev@localhost:5432/phalanxduel
REDIS_URL=redis://localhost:6379/0

# Observability (local)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
LOG_LEVEL=debug

# Server
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Optional: Sentry (dev)
PHALANX_ENABLE_LOCAL_SENTRY=0
SENTRY__SERVER__SENTRY_DSN=
VITE_ENABLE_LOCAL_SENTRY=0
VITE_SENTRY__CLIENT__SENTRY_DSN=
```

Update README.md with Docker Compose workflow:
````markdown
## Local Development with Docker Compose

1. Copy environment template:
   ```bash
   cp .env.local.example .env.local
   ```

2. Start all services (PostgreSQL, Redis, OTel Collector):
   ```bash
   docker compose up -d
   ```

3. In separate terminals, run dev servers:
   ```bash
   pnpm dev:server   # http://localhost:3001
   pnpm dev:client   # http://localhost:5173
   ```

4. View traces in SigNoz:
   ```text
   http://localhost:3301
   ```

5. Stop services:
   ```bash
   docker compose down
   ```
````

---

### 9. NATIVE DOCKER ORCHESTRATION

#### Current State

Deployed on **Fly.io** (proprietary PaaS, not standard Docker).

#### To Run Entirely on Docker Infrastructure

| Requirement | Complexity | Implementation |
|-------------|-----------|-----------------|
| **Container Registry** | L | Docker Hub / ECR / Artifactory. `docker push phalanxduel:1.0.0` |
| **Orchestration** | H | **Docker Swarm** (simple) or **Kubernetes** (production-grade) |
| **Database** | M | PostgreSQL as service in Swarm/K8s or managed (RDS, Cloud SQL) |
| **Networking** | M | Overlay networks (Swarm) or ClusterIP/LoadBalancer (K8s) |
| **Volumes** | M | Named volumes (Swarm) or PersistentVolumeClaims (K8s) |
| **Secrets** | M | Docker Secrets (Swarm) or K8s Secrets |
| **Monitoring** | M | Prometheus + Grafana + Loki for logs |
| **Ingress/TLS** | M | Traefik (Swarm) or Nginx Ingress (K8s) |
| **CI/CD** | M | Push to registry on merge, deploy via ArgoCD or Flux |

#### Docker Swarm Option (Simpler)

```yaml
# docker-compose.prod.yml (Swarm-compatible)
version: '3.9'

services:
  app:
    image: phalanxduel:1.0.0
    replicas: 3
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379/0
      PORT: 3001
    ports:
      - 3001:3001
    healthcheck:
      test: wget -qO- http://localhost:3001/health || exit 1
      interval: 30s
      timeout: 5s
      retries: 3
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        max_attempts: 3
        window: 120s
    networks:
      - phalanx-net
    secrets:
      - db_password
      - sentry_dsn

  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: phalanx
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_DB: phalanxduel
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - phalanx-net
    deploy:
      placement:
        constraints: [node.role == manager]  # Pin to manager node
    secrets:
      - db_password

  redis:
    image: redis:7-alpine
    networks:
      - phalanx-net
    deploy:
      placement:
        constraints: [node.role == manager]

  traefik:
    image: traefik:latest
    command:
      - "--api.insecure=false"
      - "--providers.docker.swarmmode=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - 80:80
      - 443:443
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - phalanx-net

networks:
  phalanx-net:
    driver: overlay

volumes:
  postgres_data:

secrets:
  db_password:
    external: true
  sentry_dsn:
    external: true
```

Deploy:
```bash
# Init Swarm
docker swarm init

# Create secrets
echo "phalanx_prod_password" | docker secret create db_password -
echo "https://key@sentry.io/project" | docker secret create sentry_dsn -

# Deploy
docker stack deploy -c docker-compose.prod.yml phalanxduel

# Check status
docker stack services phalanxduel
docker service logs phalanxduel_app
```

#### Kubernetes Option (Recommended for Scale)

```bash
# Create namespace
kubectl create namespace phalanxduel

# Create secrets
kubectl create secret generic phalanxduel-secrets \
  --from-literal=database-url="postgresql://phalanx:password@postgres:5432/phalanxduel" \
  --from-literal=sentry-dsn="https://key@sentry.io/project" \
  -n phalanxduel

# Deploy
kubectl apply -f k8s/ -n phalanxduel

# Check
kubectl get deployments,services -n phalanxduel
kubectl logs deployment/phalanxduel-server -n phalanxduel
```

---

## Complexity & Risk Matrix

| Area | Issue | Complexity | Risk | Effort (hrs) | Recommendation Priority |
|------|-------|-----------|------|-------------|------------------------|
| **Security** | Non-root USER | L | M | 0.5 | HIGH |
| **Security** | Image scanning in CI | M | M | 2 | MEDIUM |
| **Security** | Migration user setup | H | H | 3 | MEDIUM |
| **Performance** | BuildKit cache mounts | M | L | 1.5 | HIGH |
| **Performance** | Layer caching for monorepo | M | H | 2 | HIGH |
| **Performance** | Image size monitoring | M | M | 1 | MEDIUM |
| **Reliability** | Graceful shutdown | M | M | 2 | HIGH |
| **Reliability** | Cold start mitigation | L | H | 1 | MEDIUM |
| **Reliability** | Enhanced health check | M | M | 1.5 | MEDIUM |
| **Testability** | Docker CI pipeline | M | M | 3 | HIGH |
| **Testability** | docker-compose.test.yml | M | L | 1 | MEDIUM |
| **Observability** | Health/ready endpoints | L | M | 1 | HIGH |
| **Observability** | Log aggregation setup | M | M | 2 | MEDIUM |
| **Container Size** | Image size gate | L | L | 0.5 | LOW |
| **Container Size** | Prune node_modules | M | L | 1 | MEDIUM |
| **Deployment** | docker-compose.yml | M | H | 2 | HIGH |
| **Deployment** | Kubernetes manifests | H | M | 4 | MEDIUM |
| **Deployment** | Docker Swarm setup docs | H | L | 2 | LOW |
| **Local Dev** | Local compose stack | M | H | 2 | HIGH |

---

## Quick Wins (Easy to Implement Now)

1. **Add non-root USER** (0.5 hrs) — `RUN addgroup ... && adduser ... && USER nodejs`
2. **Enhance health checks** (1 hr) — Add `/ready` endpoint, check DB connectivity
3. **Add graceful shutdown** (1 hr) — SIGTERM handler in Node.js app
4. **Create docker-compose.yml** (1.5 hrs) — PostgreSQL + Redis + OTLP collector for local dev
5. **Add image size monitoring** (0.5 hrs) — CI script to check `docker image inspect` size
6. **Document OTLP env vars in Dockerfile** (0.5 hrs) — Add comments + ENV defaults

### Total: ~5 hours for foundation

---

## Strategic Recommendations

### Phase 1: Security & Reliability (Weeks 1–2)
- Add non-root USER, graceful shutdown, enhanced health checks
- Implement Docker CI pipeline with image scanning
- Create docker-compose.yml for local dev parity

### Phase 2: Performance & Observability (Weeks 3–4)
- Optimize BuildKit caching, separate deps by workspace
- Add structured logging, `/ready` endpoint
- Monitor image size, set CI gates

### Phase 3: Orchestration & Scale (Months 2–3)
- Migrate from Fly.io to Docker Swarm or Kubernetes (if multi-region needed)
- Implement blue-green deployments, canary rollouts
- Add Prometheus + Grafana, centralized log aggregation

### Phase 4: Hardening (Ongoing)
- Use Docker Hardened Images (DHI) for base OS hardening
- Regular CVE scanning, supply chain security
- Signed images, verified deployments

---

## Summary

### Dockerfile Maturity: 7/10

The current Dockerfile is solid for Fly.io deployments but has room for improvement in security, local dev experience, and Docker-native orchestration. The biggest gaps are:

1. **No local docker-compose** — High friction for onboarding
2. **No non-root user** — Security risk
3. **No graceful shutdown** — Potential data loss on container stop
4. **Single region on Fly.io** — No multi-region failover
5. **No Kubernetes manifests** — Locked into proprietary platform

Implementing the Quick Wins + Phase 1 recommendations will bring this to **9/10** and enable running entirely on Docker infrastructure (Swarm/K8s).
