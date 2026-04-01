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

function createTelemetryEnvelope(
  parentContext: Context,
  options: {
    originService: string;
    qaRunId?: string;
    reconnectAttempt: number;
    sessionId: string;
  },
) {
  const carrier: Record<string, string> = {};
  propagation.inject(parentContext, carrier);

  return {
    ...carrier,
    originService: options.originService,
    sessionId: options.sessionId,
    reconnectAttempt: options.reconnectAttempt,
    ...(options.qaRunId ? { qaRunId: options.qaRunId } : {}),
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
  let reconnectAttempt = 0;
  let socketSessionId = '';

  function currentOriginService(): string {
    return config.originService ?? 'phx-client';
  }

  function sessionAttrs(extra: Attributes = {}): Attributes {
    return {
      'ws.session_id': socketSessionId,
      'game.session_id': socketSessionId,
      'ws.reconnect_attempt': reconnectAttempt,
      ...(config.qaRunId ? { 'qa.run_id': config.qaRunId } : {}),
      ...extra,
    };
  }

  function ensureSessionSpan(attrs: Attributes = {}): Context {
    if (!sessionSpan) {
      sessionSpan = tracer.startSpan('ws.session', {
        kind: SpanKind.CLIENT,
        attributes: {
          ...wsEndpointAttrs(url),
          ...sessionAttrs(attrs),
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
      const parentContext = ensureSessionSpan(sessionAttrs());
      matchSpan = tracer.startSpan(
        'game.match',
        {
          kind: SpanKind.CLIENT,
          attributes: {
            ...wsEndpointAttrs(url),
            ...sessionAttrs(),
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
        ...sessionAttrs(),
      });
      return matchContext;
    }

    matchSpan.setAttributes({
      'match.id': matchId,
      ...sessionAttrs(),
      ...attrs,
    });
    activeMatchId = matchId;
    return matchContext ?? trace.setSpan(ensureSessionSpan(), matchSpan);
  }

  function endSessionSpan(status: SpanStatusCode, message?: string): void {
    if (!sessionSpan) return;
    sessionSpan.setStatus({ code: status, ...(message ? { message } : {}) });
    sessionSpan.end();
    sessionSpan = null;
    sessionContext = null;
  }

  function connect() {
    socketSessionId = crypto.randomUUID();
    const currentSessionContext = ensureSessionSpan();
    ws = new WebSocket(url);

    ws.addEventListener('open', () => {
      sessionSpan?.addEvent('ws.open', sessionAttrs({ 'ws.reconnect_delay_ms': reconnectDelay }));
      reconnectDelay = 1000;
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
            telemetry: createTelemetryEnvelope(sendContext, {
              originService: currentOriginService(),
              qaRunId: config.qaRunId,
              sessionId: socketSessionId,
              reconnectAttempt,
            }),
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
        sessionSpan?.addEvent(`ws.recv.${data.type}`, { ...sessionAttrs(), ...attrs });
        if (data.type === 'opponentDisconnected') {
          matchSpan?.addEvent('game.session.opponent_disconnected', sessionAttrs(attrs));
        }
        if (data.type === 'opponentReconnected') {
          matchSpan?.addEvent('game.session.opponent_reconnected', sessionAttrs(attrs));
        }
        if ('matchId' in data && typeof data.matchId === 'string') {
          const currentMatchContext = ensureMatchSpan(data.matchId, attrs);
          matchSpan?.addEvent(`ws.recv.${data.type}`, { ...sessionAttrs(), ...attrs });
          matchContext = currentMatchContext;
        }
        if (data.type === 'gameState' && data.result.postState.phase === 'gameOver') {
          matchSpan?.addEvent('game.match.complete', { ...sessionAttrs(), ...attrs });
          endMatchSpan(SpanStatusCode.OK);
        }
        onMessage(data);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.addEventListener('close', () => {
      const closeAttrs = sessionAttrs({ 'ws.reconnect_delay_ms': reconnectDelay });
      sessionSpan?.addEvent('ws.close', closeAttrs);
      matchSpan?.addEvent('game.session.disconnected', closeAttrs);
      config.onClose?.();
      if (shouldReconnect) {
        endSessionSpan(SpanStatusCode.ERROR, 'websocket disconnected before match completion');
        reconnectAttempt += 1;
        matchSpan?.addEvent(
          'game.session.reconnect_scheduled',
          sessionAttrs({ 'ws.reconnect_delay_ms': reconnectDelay }),
        );
        setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          connect();
        }, reconnectDelay);
      } else {
        endMatchSpan(SpanStatusCode.OK);
        endSessionSpan(SpanStatusCode.OK);
      }
    });

    ws.addEventListener('error', () => {
      const errorAttrs = sessionAttrs();
      sessionSpan?.addEvent('ws.error', errorAttrs);
      matchSpan?.addEvent('game.session.error', errorAttrs);
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
            telemetry: createTelemetryEnvelope(sendContext, {
              originService: currentOriginService(),
              qaRunId: message.telemetry?.qaRunId ?? config.qaRunId,
              sessionId: socketSessionId,
              reconnectAttempt,
            }),
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
