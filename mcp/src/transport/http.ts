import http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString();
  if (!raw) return undefined;
  return JSON.parse(raw) as unknown;
}

export async function startHttpTransport(server: McpServer): Promise<void> {
  const port = Number(process.env.MCP_PORT ?? 8080);
  const profile = process.env.TOOL_PROFILE ?? 'public';
  const adminToken = process.env.MCP_ADMIN_TOKEN;

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  async function handleReq(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (profile === 'admin' && adminToken) {
      if (req.headers.authorization !== `Bearer ${adminToken}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    }

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, profile }));
      return;
    }

    if (req.url?.startsWith('/mcp')) {
      const body = req.method === 'POST' ? await readBody(req) : undefined;
      await transport.handleRequest(req, res, body);
      return;
    }

    res.writeHead(404);
    res.end();
  }

  const httpServer = http.createServer((req, res) => {
    void handleReq(req, res);
  });

  httpServer.listen(port, '0.0.0.0', () => {
    process.stderr.write(`phalanx-duel MCP [${profile}] listening on :${port}\n`);
  });
}
