import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerEngineTools } from './tools/engine.js';
import { registerDataTools } from './tools/data.js';
import { registerAnalysisTools } from './tools/analysis.js';
import { registerResources } from './resources.js';

const server = new McpServer({
  name: 'phalanx-duel',
  version: '1.0.0',
});

registerEngineTools(server);
registerDataTools(server);
registerAnalysisTools(server);
registerResources(server);

const transport = new StdioServerTransport();
await server.connect(transport);
