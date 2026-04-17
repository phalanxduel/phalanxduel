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
import { getSavedSession } from './state';

export interface Connection {
  send(message: OutboundClientMessage): void;
  close(): void;
}

export type ConnectionLifecycleState = 'CONNECTING' | 'OPEN' | 'DISCONNECTED';

export interface ConnectionConfig {
  onClose?: () => void;
  onOpen?: () => void;
  onStateChange?: (state: ConnectionLifecycleState) => void;
  originService?: string;
  qaRunId?: string;
}

type TransportClientMessage = Extract<ClientMessage, { type: 'ack' | 'ping' | 'pong' }>;
type ReliableClientMessage = Exclude<ClientMessage, { type: 'ack' | 'ping' | 'pong' }>;
type OutboundReliableClientMessage = ReliableClientMessage extends infer Message
  ? Message extends { msgId: string }
    ? Omit<Message, 'msgId'> & { msgId?: string }
    : Message
  : never;
type OutboundClientMessage = OutboundReliableClientMessage | TransportClientMessage;

interface PendingEntry {
  message: ReliableClientMessage & { msgId: string };
  serialized: string;
}

const tracer = trace.getTracer('phx-client');
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 65_000;
const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

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

function matchAttrs(message: OutboundClientMessage | ServerMessage): Attributes {
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

function isReliableMessage(
  message: OutboundClientMessage,
): message is OutboundReliableClientMessage {
  return message.type !== 'ack' && message.type !== 'ping' && message.type !== 'pong';
}

export function createConnection(
  url: string,
  onMessage: (message: ServerMessage) => void,
  config: ConnectionConfig = {},
): Connection {
  let ws: WebSocket | null = null;
  let reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
  let shouldReconnect = true;
  let sessionSpan: Span | null = null;
  let sessionContext: Context | null = null;
  let matchSpan: Span | null = null;
  let matchContext: Context | null = null;
  let activeMatchId: string | null = null;
  let reconnectAttempt = 0;
  let socketSessionId = '';
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  let heartbeatWatchdog: ReturnType<typeof setInterval> | null = null;
  let lastServerActivityAt = Date.now();
  let awaitingResync = false;
  const pending = new Map<string, PendingEntry>();

  function currentOriginService(): string {
    return config.originService ?? 'phx-client';
  }

  function updateState(state: ConnectionLifecycleState): void {
    config.onStateChange?.(state);
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

  function clearHeartbeatTimers(): void {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (heartbeatWatchdog) clearInterval(heartbeatWatchdog);
    heartbeatInterval = null;
    heartbeatWatchdog = null;
  }

  const sendRaw = (payload: string): void => {
    if (ws?.readyState === WebSocket.OPEN) {
      console.log(`[connection] sendRaw: ${payload.substring(0, 100)}...`);
      ws.send(payload);
    } else {
      console.warn(
        `[connection] sendRaw skipped (readystate=${ws?.readyState}): ${payload.substring(0, 100)}...`,
      );
    }
  };

  function sendTransportMessage(message: TransportClientMessage): void {
    sendRaw(JSON.stringify(message));
  }

  function queueReliableMessage(
    message: OutboundReliableClientMessage,
    options: { replaceType?: OutboundReliableClientMessage['type'] } = {},
  ): PendingEntry {
    if (options.replaceType) {
      for (const [msgId, entry] of pending) {
        if (entry.message.type === options.replaceType) {
          pending.delete(msgId);
        }
      }
    }

    const msgId =
      'msgId' in message && typeof message.msgId === 'string' ? message.msgId : crypto.randomUUID();
    const queuedMessage = {
      ...message,
      msgId,
    } as ReliableClientMessage & { msgId: string };
    const entry = {
      message: queuedMessage,
      serialized: JSON.stringify(queuedMessage),
    };
    pending.set(msgId, entry);
    return entry;
  }

  function flushPendingQueue(): void {
    if (awaitingResync) return;
    for (const entry of pending.values()) {
      sendRaw(entry.serialized);
    }
  }

  function bootstrapConnection(): void {
    const authToken = getToken();
    if (authToken) {
      const sendContext = ensureSessionSpan(sessionAttrs());
      const sendSpan = tracer.startSpan(
        'ws.send.authenticate',
        {
          kind: SpanKind.CLIENT,
          attributes: {
            ...wsEndpointAttrs(url),
          },
        },
        sendContext,
      );
      const tracedContext = trace.setSpan(sendContext, sendSpan);
      const entry = queueReliableMessage(
        {
          type: 'authenticate',
          token: authToken,
          telemetry: createTelemetryEnvelope(tracedContext, {
            originService: currentOriginService(),
            qaRunId: config.qaRunId,
            sessionId: socketSessionId,
            reconnectAttempt,
          }),
        },
        { replaceType: 'authenticate' },
      );
      sendRaw(entry.serialized);
      sendSpan.end();
    }

    const savedSession = getSavedSession();
    awaitingResync = Boolean(savedSession?.matchId && savedSession.playerId);
    if (savedSession?.matchId && savedSession.playerId) {
      const sendContext = ensureMatchSpan(savedSession.matchId, sessionAttrs());
      const sendSpan = tracer.startSpan(
        'ws.send.rejoinMatch',
        {
          kind: SpanKind.CLIENT,
          attributes: {
            ...wsEndpointAttrs(url),
            'match.id': savedSession.matchId,
            'player.id': savedSession.playerId,
          },
        },
        sendContext,
      );
      const tracedContext = trace.setSpan(sendContext, sendSpan);
      const entry = queueReliableMessage(
        {
          type: 'rejoinMatch',
          matchId: savedSession.matchId,
          playerId: savedSession.playerId,
          telemetry: createTelemetryEnvelope(tracedContext, {
            originService: currentOriginService(),
            qaRunId: config.qaRunId,
            sessionId: socketSessionId,
            reconnectAttempt,
          }),
        },
        { replaceType: 'rejoinMatch' },
      );
      sendRaw(entry.serialized);
      sendSpan.end();
    } else {
      flushPendingQueue();
    }
  }

  function startHeartbeat(): void {
    clearHeartbeatTimers();
    lastServerActivityAt = Date.now();

    heartbeatInterval = setInterval(() => {
      sendTransportMessage({
        type: 'ping',
        msgId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        telemetry: {
          originService: currentOriginService(),
          sessionId: socketSessionId,
          reconnectAttempt,
          ...(config.qaRunId ? { qaRunId: config.qaRunId } : {}),
        },
      });
    }, HEARTBEAT_INTERVAL_MS);

    heartbeatWatchdog = setInterval(() => {
      if (Date.now() - lastServerActivityAt > HEARTBEAT_TIMEOUT_MS && ws) {
        sessionSpan?.addEvent('ws.heartbeat_timeout', sessionAttrs());
        ws.close(4001, 'Heartbeat timeout');
      }
    }, 5_000);
  }

  function scheduleReconnect(): void {
    const jitter = Math.floor(reconnectDelay * 0.2 * Math.random());
    const delayWithJitter = Math.min(reconnectDelay + jitter, MAX_RECONNECT_DELAY_MS);
    matchSpan?.addEvent(
      'game.session.reconnect_scheduled',
      sessionAttrs({ 'ws.reconnect_delay_ms': delayWithJitter }),
    );
    setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
      connect();
    }, delayWithJitter);
  }

  function connect() {
    updateState('CONNECTING');
    socketSessionId = crypto.randomUUID();
    const currentSessionContext = ensureSessionSpan();
    ws = new WebSocket(url);

    ws.addEventListener('open', () => {
      console.log(`[connection] WebSocket OPEN: ${url}`);
      lastServerActivityAt = Date.now();
      sessionSpan?.addEvent('ws.open', sessionAttrs({ 'ws.reconnect_delay_ms': reconnectDelay }));
      reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
      updateState('OPEN');
      config.onOpen?.();
      startHeartbeat();
      bootstrapConnection();
    });

    ws.addEventListener('message', (event) => {
      lastServerActivityAt = Date.now();
      try {
        const data = JSON.parse(event.data as string) as ServerMessage;

        if ('msgId' in data && typeof data.msgId === 'string' && data.type !== 'ack') {
          sendTransportMessage({ type: 'ack', ackedMsgId: data.msgId, msgId: crypto.randomUUID() });
        }

        if (data.type === 'ack') {
          if (typeof data.ackedMsgId === 'string') {
            pending.delete(data.ackedMsgId);
          }
          return;
        }

        if (data.type === 'ping') {
          const replyTo = typeof data.msgId === 'string' ? data.msgId : undefined;
          sendTransportMessage({
            type: 'pong',
            msgId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            replyTo,
          });
          return;
        }

        if (data.type === 'pong') {
          return;
        }

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
        if (data.type === 'matchJoined' || data.type === 'matchCreated') {
          awaitingResync = false;
          flushPendingQueue();
        }
        if (data.type === 'gameState' && data.result.postState.phase === 'gameOver') {
          awaitingResync = false;
          matchSpan?.addEvent('game.match.complete', { ...sessionAttrs(), ...attrs });
          endMatchSpan(SpanStatusCode.OK);
        }
        onMessage(data);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.addEventListener('close', (event) => {
      console.log(`[connection] WebSocket CLOSE: ${url} code=${event.code} reason=${event.reason}`);
      clearHeartbeatTimers();
      const closeAttrs = sessionAttrs({ 'ws.reconnect_delay_ms': reconnectDelay });
      sessionSpan?.addEvent('ws.close', closeAttrs);
      matchSpan?.addEvent('game.session.disconnected', closeAttrs);
      updateState('DISCONNECTED');
      config.onClose?.();
      if (shouldReconnect) {
        endSessionSpan(SpanStatusCode.ERROR, 'websocket disconnected before match completion');
        reconnectAttempt += 1;
        scheduleReconnect();
      } else {
        endMatchSpan(SpanStatusCode.OK);
        endSessionSpan(SpanStatusCode.OK);
      }
    });

    ws.addEventListener('error', (event) => {
      console.error(`[connection] WebSocket ERROR on ${url}:`, event);
      const errorAttrs = sessionAttrs();
      sessionSpan?.addEvent('ws.error', errorAttrs);
      matchSpan?.addEvent('game.session.error', errorAttrs);
    });

    void currentSessionContext;
  }

  connect();

  return {
    send(message: OutboundClientMessage) {
      const attrs = matchAttrs(message);
      const currentSessionContext =
        'matchId' in message && typeof message.matchId === 'string'
          ? ensureMatchSpan(message.matchId, attrs)
          : (matchContext ?? ensureSessionSpan(attrs));

      if (!isReliableMessage(message)) {
        sendTransportMessage(message);
        return;
      }

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
      const entry = queueReliableMessage({
        ...message,
        telemetry: createTelemetryEnvelope(sendContext, {
          originService: currentOriginService(),
          qaRunId: message.telemetry?.qaRunId ?? config.qaRunId,
          sessionId: socketSessionId,
          reconnectAttempt,
        }),
      });
      sendSpan.end();

      if (ws?.readyState === WebSocket.OPEN) {
        sendRaw(entry.serialized);
      }
    },
    close() {
      shouldReconnect = false;
      clearHeartbeatTimers();
      updateState('DISCONNECTED');
      ws?.close();
      endSessionSpan(SpanStatusCode.OK);
    },
  };
}
