import type { ServerMessage, ClientMessage } from '@phalanxduel/shared';
import {
  context,
  propagation,
  trace,
  SpanKind,
  SpanStatusCode,
  type Attributes,
  type Context,
  type Span,
} from '@opentelemetry/api';
import { getToken } from './auth';

export interface Connection {
  send(message: ClientMessage): void;
  close(): void;
}

const tracer = trace.getTracer('phx-client');

function matchAttrs(message: ClientMessage | ServerMessage): Attributes {
  const attrs: Attributes = {
    'network.protocol.name': 'websocket',
  };

  if ('matchId' in message && typeof message.matchId === 'string') {
    attrs['match.id'] = message.matchId;
  }
  if ('action' in message && message.action && typeof message.action.type === 'string') {
    attrs['action.type'] = message.action.type;
  }
  if ('playerId' in message && typeof message.playerId === 'string') {
    attrs['player.id'] = message.playerId;
  }
  if ('playerIndex' in message && typeof message.playerIndex === 'number') {
    attrs['player.index'] = message.playerIndex;
  }
  if ('spectatorId' in message && typeof message.spectatorId === 'string') {
    attrs['spectator.id'] = message.spectatorId;
  }

  return attrs;
}

function createTelemetryEnvelope(parentContext: Context, originService: string, qaRunId?: string) {
  const carrier: Record<string, string> = {};
  propagation.inject(parentContext, carrier);

  return {
    ...carrier,
    originService,
    ...(qaRunId ? { qaRunId } : {}),
  };
}

export function createConnection(
  url: string,
  onMessage: (message: ServerMessage) => void,
  onOpen?: () => void,
  onClose?: () => void,
): Connection {
  let ws: WebSocket | null = null;
  let reconnectDelay = 1000;
  let shouldReconnect = true;
  let sessionSpan: Span | null = null;
  let sessionContext: Context | null = null;

  function ensureSessionSpan(attrs: Attributes = {}): Context {
    if (!sessionSpan) {
      sessionSpan = tracer.startSpan('ws.session', {
        kind: SpanKind.CLIENT,
        attributes: {
          'network.protocol.name': 'websocket',
          'server.address': url,
          ...attrs,
        },
      });
      sessionContext = trace.setSpan(context.active(), sessionSpan);
      return sessionContext;
    }

    sessionSpan.setAttributes(attrs);
    return sessionContext ?? trace.setSpan(context.active(), sessionSpan);
  }

  function endSessionSpan(status: SpanStatusCode, message?: string): void {
    if (!sessionSpan) return;
    sessionSpan.setStatus({ code: status, ...(message ? { message } : {}) });
    sessionSpan.end();
    sessionSpan = null;
    sessionContext = null;
  }

  function connect() {
    const currentSessionContext = ensureSessionSpan();
    ws = new WebSocket(url);

    ws.addEventListener('open', () => {
      reconnectDelay = 1000;
      sessionSpan?.addEvent('ws.open');
      onOpen?.();
      const authToken = getToken();
      if (authToken && ws) {
        const sendSpan = tracer.startSpan(
          'ws.send.authenticate',
          {
            kind: SpanKind.CLIENT,
            attributes: {
              'network.protocol.name': 'websocket',
            },
          },
          currentSessionContext,
        );
        const sendContext = trace.setSpan(currentSessionContext, sendSpan);
        ws.send(
          JSON.stringify({
            type: 'authenticate',
            token: authToken,
            telemetry: createTelemetryEnvelope(sendContext, 'phx-client'),
          }),
        );
        sendSpan.end();
      }
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data as string) as ServerMessage;
        sessionSpan?.setAttributes(matchAttrs(data));
        sessionSpan?.addEvent(`ws.recv.${data.type}`, matchAttrs(data));
        onMessage(data);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.addEventListener('close', () => {
      sessionSpan?.addEvent('ws.close', { 'ws.reconnect_delay_ms': reconnectDelay });
      onClose?.();
      if (shouldReconnect) {
        setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          connect();
        }, reconnectDelay);
      } else {
        endSessionSpan(SpanStatusCode.OK);
      }
    });

    ws.addEventListener('error', () => {
      sessionSpan?.addEvent('ws.error');
    });
  }

  connect();

  return {
    send(message: ClientMessage) {
      if (ws?.readyState === WebSocket.OPEN) {
        const attrs = matchAttrs(message);
        const currentSessionContext = ensureSessionSpan(attrs);
        const sendSpan = tracer.startSpan(
          `ws.send.${message.type}`,
          {
            kind: SpanKind.CLIENT,
            attributes: attrs,
          },
          currentSessionContext,
        );
        const sendContext = trace.setSpan(currentSessionContext, sendSpan);
        ws.send(
          JSON.stringify({
            ...message,
            telemetry: createTelemetryEnvelope(
              sendContext,
              'phx-client',
              message.telemetry?.qaRunId,
            ),
          }),
        );
        sendSpan.end();
      }
    },
    close() {
      shouldReconnect = false;
      ws?.close();
      endSessionSpan(SpanStatusCode.OK);
    },
  };
}
