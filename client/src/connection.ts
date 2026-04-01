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

export interface ConnectionConfig {
  onClose?: () => void;
  onOpen?: () => void;
  originService?: string;
  qaRunId?: string;
}

const tracer = trace.getTracer('phx-client');

function wsEndpointAttrs(url: string): Attributes {
  const attrs: Attributes = {
    'network.protocol.name': 'websocket',
    'url.full': url,
    'peer.service': 'phx-server',
  };

  try {
    const parsed = new URL(url);
    attrs['server.address'] = parsed.hostname;
    if (parsed.port) {
      attrs['server.port'] = Number(parsed.port);
    }
    attrs['url.scheme'] = parsed.protocol.replace(/:$/u, '');
    attrs['url.path'] = parsed.pathname;
  } catch {
    attrs['server.address'] = url;
  }

  return attrs;
}

function matchAttrs(message: ClientMessage | ServerMessage): Attributes {
  const attrs: Attributes = {
    'network.protocol.name': 'websocket',
  };

  if ('matchId' in message && typeof message.matchId === 'string') {
    attrs['match.id'] = message.matchId;
  }
  if ('action' in message && typeof message.action.type === 'string') {
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
  config: ConnectionConfig = {},
): Connection {
  let ws: WebSocket | null = null;
  let reconnectDelay = 1000;
  let shouldReconnect = true;
  let sessionSpan: Span | null = null;
  let sessionContext: Context | null = null;
  let matchSpan: Span | null = null;
  let matchContext: Context | null = null;
  let activeMatchId: string | null = null;

  function currentOriginService(): string {
    return config.originService ?? 'phx-client';
  }

  function ensureSessionSpan(attrs: Attributes = {}): Context {
    if (!sessionSpan) {
      sessionSpan = tracer.startSpan('ws.session', {
        kind: SpanKind.CLIENT,
        attributes: {
          ...wsEndpointAttrs(url),
          ...(config.qaRunId ? { 'qa.run_id': config.qaRunId } : {}),
          ...attrs,
        },
      });
      sessionContext = trace.setSpan(context.active(), sessionSpan);
      return sessionContext;
    }

    sessionSpan.setAttributes(attrs);
    return sessionContext ?? trace.setSpan(context.active(), sessionSpan);
  }

  function endMatchSpan(status: SpanStatusCode, message?: string): void {
    if (!matchSpan) return;
    matchSpan.setStatus({ code: status, ...(message ? { message } : {}) });
    matchSpan.end();
    matchSpan = null;
    matchContext = null;
    activeMatchId = null;
  }

  function ensureMatchSpan(matchId: string, attrs: Attributes = {}): Context {
    if (activeMatchId && activeMatchId !== matchId) {
      endMatchSpan(SpanStatusCode.OK, `match switched from ${activeMatchId} to ${matchId}`);
    }

    if (!matchSpan) {
      const parentContext = ensureSessionSpan(
        config.qaRunId ? { 'qa.run_id': config.qaRunId } : {},
      );
      matchSpan = tracer.startSpan(
        'game.match',
        {
          kind: SpanKind.CLIENT,
          attributes: {
            ...wsEndpointAttrs(url),
            ...(config.qaRunId ? { 'qa.run_id': config.qaRunId } : {}),
            'match.id': matchId,
            ...attrs,
          },
        },
        parentContext,
      );
      matchContext = trace.setSpan(parentContext, matchSpan);
      activeMatchId = matchId;
      matchSpan.addEvent('game.match.bound', {
        'match.id': matchId,
        ...(config.qaRunId ? { 'qa.run_id': config.qaRunId } : {}),
      });
      return matchContext;
    }

    matchSpan.setAttributes({
      'match.id': matchId,
      ...attrs,
    });
    activeMatchId = matchId;
    return matchContext ?? trace.setSpan(ensureSessionSpan(), matchSpan);
  }

  function endSessionSpan(status: SpanStatusCode, message?: string): void {
    endMatchSpan(status, message);
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
      config.onOpen?.();
      const authToken = getToken();
      if (authToken && ws) {
        const sendSpan = tracer.startSpan(
          'ws.send.authenticate',
          {
            kind: SpanKind.CLIENT,
            attributes: {
              ...wsEndpointAttrs(url),
            },
          },
          currentSessionContext,
        );
        const sendContext = trace.setSpan(currentSessionContext, sendSpan);
        ws.send(
          JSON.stringify({
            type: 'authenticate',
            token: authToken,
            telemetry: createTelemetryEnvelope(sendContext, currentOriginService(), config.qaRunId),
          }),
        );
        sendSpan.end();
      }
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data as string) as ServerMessage;
        const attrs = matchAttrs(data);
        sessionSpan?.setAttributes(attrs);
        sessionSpan?.addEvent(`ws.recv.${data.type}`, attrs);
        if ('matchId' in data && typeof data.matchId === 'string') {
          const currentMatchContext = ensureMatchSpan(data.matchId, attrs);
          matchSpan?.addEvent(`ws.recv.${data.type}`, attrs);
          matchContext = currentMatchContext;
        }
        if (data.type === 'gameState' && data.result.postState.phase === 'gameOver') {
          matchSpan?.addEvent('game.match.complete', attrs);
          endMatchSpan(SpanStatusCode.OK);
        }
        onMessage(data);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.addEventListener('close', () => {
      sessionSpan?.addEvent('ws.close', { 'ws.reconnect_delay_ms': reconnectDelay });
      config.onClose?.();
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
        const currentSessionContext =
          'matchId' in message && typeof message.matchId === 'string'
            ? ensureMatchSpan(message.matchId, attrs)
            : (matchContext ?? ensureSessionSpan(attrs));
        const sendSpan = tracer.startSpan(
          `ws.send.${message.type}`,
          {
            kind: SpanKind.CLIENT,
            attributes: {
              ...wsEndpointAttrs(url),
              ...attrs,
            },
          },
          currentSessionContext,
        );
        const sendContext = trace.setSpan(currentSessionContext, sendSpan);
        ws.send(
          JSON.stringify({
            ...message,
            telemetry: createTelemetryEnvelope(
              sendContext,
              currentOriginService(),
              message.telemetry?.qaRunId ?? config.qaRunId,
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
