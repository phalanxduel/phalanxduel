import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerEngineTools } from './tools/engine.js';
import { registerResources } from './resources.js';

const profile = (process.env.TOOL_PROFILE ?? 'public') as 'public' | 'admin';
const transportMode = process.env.TRANSPORT ?? 'stdio';

const server = new McpServer({ name: 'phalanx-duel', version: '1.0.0' });

registerEngineTools(server);
registerResources(server);

if (process.env.DATABASE_URL) {
  const { registerDataTools } = await import('./tools/data.js');
  registerDataTools(server);

  if (profile === 'admin') {
    const { registerAdminTools } = await import('./tools/admin.js');
    registerAdminTools(server);

    const { registerEmbeddingTools } = await import('./tools/embeddings.js');
    registerEmbeddingTools(server);
  }
}

if (profile === 'admin') {
  try {
    const { registerAnalysisTools } = await import('./tools/analysis.js');
    registerAnalysisTools(server);
  } catch (err) {
    process.stderr.write(`[warn] analysis tools unavailable: ${String(err)}\n`);
  }
}

if (transportMode === 'http') {
  const { startHttpTransport } = await import('./transport/http.js');
  await startHttpTransport(server);
} else {
  const t = new StdioServerTransport();
  await server.connect(t);
}
