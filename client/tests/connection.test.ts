import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createConnection, type ConnectionLifecycleState } from '../src/connection';
import { setToken } from '../src/auth';

type WsListener = (event: unknown) => void;

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = MockWebSocket.OPEN;
  private listeners: Record<string, WsListener[]> = {};

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  addEventListener(event: string, cb: WsListener) {
    (this.listeners[event] ??= []).push(cb);
  }

  send = vi.fn();
  close = vi.fn((code?: number, reason?: string) => {
    this.readyState = MockWebSocket.CLOSED;
    this.fire('close', { code, reason });
  });

  fire(event: string, data?: unknown) {
    for (const cb of this.listeners[event] ?? []) {
      cb(data ?? {});
    }
  }
}

Object.defineProperty(MockWebSocket, 'OPEN', { value: 1 });
Object.defineProperty(MockWebSocket, 'CLOSED', { value: 3 });

describe('createConnection', () => {
  const sessionStore: Record<string, string> = {};
  let onMessage: ReturnType<
    typeof vi.fn<(message: import('@phalanxduel/shared').ServerMessage) => void>
  >;
  let onStateChange: ReturnType<typeof vi.fn<(state: ConnectionLifecycleState) => void>>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => sessionStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        sessionStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete sessionStore[key];
      }),
    });
    onMessage = vi.fn();
    onStateChange = vi.fn();
    vi.clearAllMocks();
    setToken(null);
    for (const key of Object.keys(sessionStore)) delete sessionStore[key];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setToken(null);
  });

  function lastWs(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1]!;
  }

  it('starts in CONNECTING and transitions to OPEN on socket open', () => {
    createConnection('ws://test:3001', onMessage, { onStateChange });
    expect(onStateChange).toHaveBeenCalledWith('CONNECTING');

    lastWs().fire('open');

    expect(onStateChange).toHaveBeenLastCalledWith('OPEN');
  });

  it('serializes reliable messages with msgId and telemetry', () => {
    const conn = createConnection('ws://test:3001', onMessage);
    const ws = lastWs();
    ws.fire('open');

    conn.send({
      type: 'createMatch',
      playerName: 'Alice',
      gameOptions: {
        damageMode: 'classic',
        startingLifepoints: 20,
        classicDeployment: true,
      },
    });

    const sent = JSON.parse(String(ws.send.mock.calls.at(-1)?.[0]));
    expect(sent).toMatchObject({
      type: 'createMatch',
      playerName: 'Alice',
      msgId: expect.any(String),
      telemetry: {
        originService: 'phx-client',
        reconnectAttempt: 0,
        sessionId: expect.any(String),
      },
    });
  });

  it('removes pending messages when the server ACKs them', () => {
    const conn = createConnection('ws://test:3001', onMessage);
    const ws = lastWs();
    ws.fire('open');

    conn.send({
      type: 'joinMatch',
      matchId: '3dff75bd-e19d-4ae6-99e4-bf6607ed58cb',
      playerName: 'Alice',
    });

    const outbound = JSON.parse(String(ws.send.mock.calls.at(-1)?.[0]));
    ws.send.mockClear();

    ws.fire('message', {
      data: JSON.stringify({ type: 'ack', ackedMsgId: outbound.msgId }),
    });

    ws.fire('close');
    vi.advanceTimersByTime(1000);
    lastWs().fire('open');

    expect(lastWs().send).not.toHaveBeenCalledWith(JSON.stringify(outbound));
  });

  it('flushes pending reliable messages after reconnect', () => {
    const conn = createConnection('ws://test:3001', onMessage);
    const ws = lastWs();
    ws.fire('open');

    conn.send({
      type: 'joinMatch',
      matchId: '3dff75bd-e19d-4ae6-99e4-bf6607ed58cb',
      playerName: 'Alice',
    });

    const outbound = JSON.parse(String(ws.send.mock.calls.at(-1)?.[0]));

    ws.fire('close');
    vi.advanceTimersByTime(1000);
    const reconnected = lastWs();
    reconnected.fire('open');

    const resent = reconnected.send.mock.calls
      .map((call) => JSON.parse(String(call[0])))
      .find((message) => message.type === 'joinMatch');
    expect(resent).toMatchObject({
      type: 'joinMatch',
      matchId: outbound.matchId,
      msgId: outbound.msgId,
    });
  });

  it('responds to server ping messages with pong', () => {
    createConnection('ws://test:3001', onMessage);
    const ws = lastWs();
    ws.fire('open');
    ws.send.mockClear();

    ws.fire('message', {
      data: JSON.stringify({
        type: 'ping',
        msgId: '20edcac1-2ca3-4d6a-9ca8-5b83a059d47d',
        timestamp: new Date().toISOString(),
      }),
    });

    const sent = JSON.parse(String(ws.send.mock.calls.at(-1)?.[0]));
    expect(sent).toMatchObject({
      type: 'pong',
      replyTo: '20edcac1-2ca3-4d6a-9ca8-5b83a059d47d',
    });
  });

  it('closes and reconnects when heartbeat times out', () => {
    createConnection('ws://test:3001', onMessage, { onStateChange });
    const ws = lastWs();
    ws.fire('open');

    vi.advanceTimersByTime(70_000);

    expect(ws.close).toHaveBeenCalledWith(4001, 'Heartbeat timeout');
    expect(onStateChange).toHaveBeenCalledWith('DISCONNECTED');
    vi.advanceTimersByTime(1000);
    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
  });

  it('sends rejoinMatch before flushing queued messages when a saved session exists', () => {
    sessionStore.phalanx_session = JSON.stringify({
      matchId: '0be0719d-6d98-4f10-9ff3-42535a9b6151',
      playerId: '5d9ab163-f763-4489-ab74-fdaa54a8f7c6',
      playerIndex: 0,
      playerName: 'Alice',
    });

    const conn = createConnection('ws://test:3001', onMessage);
    const ws = lastWs();
    conn.send({
      type: 'action',
      matchId: '0be0719d-6d98-4f10-9ff3-42535a9b6151',
      action: {
        type: 'forfeit',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      },
    });

    ws.fire('open');

    const firstSent = JSON.parse(String(ws.send.mock.calls.at(-1)?.[0]));
    expect(firstSent.type).toBe('rejoinMatch');

    ws.fire('message', {
      data: JSON.stringify({
        type: 'matchJoined',
        matchId: '0be0719d-6d98-4f10-9ff3-42535a9b6151',
        playerId: '5d9ab163-f763-4489-ab74-fdaa54a8f7c6',
        playerIndex: 0,
      }),
    });

    const sentTypes = ws.send.mock.calls.map((call) => JSON.parse(String(call[0])).type);
    expect(sentTypes).toContain('action');
  });
});
