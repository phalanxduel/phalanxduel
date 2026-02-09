import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type { RawData } from 'ws';
import { SCHEMA_VERSION } from '@phalanx/shared';
import { traceWsMessage } from './tracing';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(websocket);

  // ── Health endpoint ──────────────────────────────────────────────
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: SCHEMA_VERSION,
    };
  });

  // ── WebSocket placeholder ────────────────────────────────────────
  app.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (socket, _req) => {
      socket.on('message', (raw: RawData) => {
        const messageStr = typeof raw === 'string' ? raw : raw.toString();
        traceWsMessage(
          'message',
          { 'message.raw_type': typeof raw },
          (_span) => {
            // Placeholder: echo acknowledgment
            socket.send(
              JSON.stringify({
                type: 'ack',
                received: true,
                echo: messageStr,
              }),
            );
          },
        );
      });

      socket.on('close', () => {
        app.log.info('WebSocket client disconnected');
      });
    });
  });

  return app;
}
