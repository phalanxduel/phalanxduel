FROM node:22-slim

WORKDIR /app

# Install dependencies for the whole workspace (simplified)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY engine/package.json engine/
COPY server/package.json server/
COPY mcp/package.json mcp/
COPY agents/autonomous-bot/package.json agents/autonomous-bot/

RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

WORKDIR /app/agents/autonomous-bot

# Default environment variables
ENV MCP_TRANSPORT=stdio
ENV GAME_SERVER_URL=http://server:3001
ENV BOT_TIER=soldier
ENV MATCH_COUNT=10

CMD ["pnpm", "start"]
