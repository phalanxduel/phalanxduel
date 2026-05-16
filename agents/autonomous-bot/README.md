# Autonomous Phalanx Duel Bot

This package contains an autonomous AI agent that plays Phalanx Duel by connecting to the game's [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server.

## Features

- **Self-Registering**: Automatically creates a new user account on the game server for each instance.
- **Headless Gameplay**: Uses the MCP `gameplay` and `engine` tools to make decisions and submit actions.
- **AI-Powered**: Can use either internal MCTS/Heuristic logic or call an LLM (e.g., local Llama via Ollama) for tactical analysis.
- **Scalable**: Designed to be run in multiple instances to simulate game scale and test concurrency.

## Getting Started

### Prerequisites

- Node.js 22+
- A running Phalanx Duel game server.
- (Optional) Ollama running locally for LLM-backed decisions.

### Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `MCP_TRANSPORT` | `stdio` or `http` | `stdio` |
| `GAME_SERVER_URL` | URL of the game server | `http://127.0.0.1:3001` |
| `BOT_TIER` | Difficulty of the opponent to play against | `soldier` |
| `MATCH_COUNT` | Number of matches to play before exiting | `5` |
| `DATABASE_URL` | Required if using `stdio` transport | - |

### Running Locally

```bash
pnpm install
pnpm start
```

### Running with Docker

```bash
docker compose up bot-agent
```

To scale up to 10 bots:
```bash
docker compose up --scale bot-agent=10 bot-agent
```

## Performance Stats

After completing its assigned matches, the bot will output a summary report:
- Total Matches Played
- Win/Loss Record
- Win Rate
- Average Turns per Match
