import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createInitialState, applyAction } from '@phalanxduel/engine';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['--import', 'tsx/esm', 'mcp/src/server.ts'],
  env: {
    ...process.env,
    TOOL_PROFILE: 'admin',
    ANALYSIS_PROVIDER: 'llama',
    LLAMA_BASE_URL: 'http://127.0.0.1:8080/v1',
    LLAMA_MODEL: 'local',
    // Deliberately no ANTHROPIC_API_KEY — proves llama path loads without it
    ANTHROPIC_API_KEY: '',
  },
});

const client = new Client({ name: 'dogfood-demo', version: '1.0' });
await client.connect(transport);

const { tools } = await client.listTools();
const hasAnalyze = tools.some((t) => t.name === 'match_analyze');
console.log(`\nanalysis tools registered: ${hasAnalyze} (${tools.length} total)`);
console.log('provider: llama  |  model: local  |  no ANTHROPIC_API_KEY required ✓');

// Build an in-progress game state
const ts = new Date().toISOString();
let state = createInitialState({
  matchId: 'dogfood-001',
  players: [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ],
  rngSeed: 99,
  gameOptions: { classicDeployment: true, quickStart: true, startingLifepoints: 20 },
});
state = applyAction(
  state,
  { type: 'system:init', timestamp: ts, config: undefined },
  { allowSystemInit: true },
);

// Simulate a few attacks to create an interesting state
state = applyAction(state, {
  type: 'attack',
  playerIndex: 0,
  attackingColumn: 0,
  defendingColumn: 0,
  timestamp: ts,
});
state = applyAction(state, { type: 'pass', playerIndex: 1, timestamp: ts });
state = applyAction(state, {
  type: 'attack',
  playerIndex: 0,
  attackingColumn: 2,
  defendingColumn: 2,
  timestamp: ts,
});

console.log(
  `\nGame state: phase=${state.phase}  Alice LP=${state.players[0]?.lifepoints}  Bob LP=${state.players[1]?.lifepoints}`,
);
console.log('Calling match_analyze via llama...\n');

const result = await client.callTool({
  name: 'match_analyze',
  arguments: { state, focus: 'turning_points' },
});

const text = ((result as { content: Array<{ text: string }> }).content[0]?.text ?? '').trim();
console.log('=== match_analyze (qwen2.5-coder-7b, focus=turning_points) ===\n');
console.log(text);

await client.close();
