FROM node:24-alpine
WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

# All workspace package.json files needed for pnpm lockfile resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/
COPY admin/package.json admin/
COPY mcp/package.json mcp/

# Install all deps including devDeps (tsx is a devDep)
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# Copy only the source packages the MCP server imports from
COPY shared/ shared/
COPY engine/ engine/
COPY server/src/ server/src/
COPY mcp/ mcp/

RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nodejs
USER nodejs

ENV NODE_ENV=production
ENV TRANSPORT=http
ENV MCP_PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health > /dev/null 2>&1 || exit 1

STOPSIGNAL SIGTERM

CMD ["node", "--import", "tsx/esm", "mcp/src/server.ts"]
