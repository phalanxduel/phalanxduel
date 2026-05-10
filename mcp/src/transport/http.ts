import http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MB

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  let received = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    received += buf.byteLength;
    if (received > MAX_BODY_BYTES) {
      throw Object.assign(new Error('Request body too large'), { statusCode: 413 });
    }
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString();
  if (!raw) return undefined;
  return JSON.parse(raw) as unknown;
}

export async function startHttpTransport(server: McpServer): Promise<void> {
  const port = Number(process.env.MCP_PORT ?? 8080);
  const profile = process.env.TOOL_PROFILE ?? 'public';
  const adminToken = process.env.MCP_ADMIN_TOKEN;

  if (profile === 'admin' && !adminToken) {
    process.stderr.write(
      '[fatal] MCP_ADMIN_TOKEN must be set when TOOL_PROFILE=admin and TRANSPORT=http\n',
    );
    process.exit(1);
  }

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
      let body: unknown;
      try {
        body = req.method === 'POST' ? await readBody(req) : undefined;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode ?? 400;
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (err as Error).message }));
        return;
      }
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
