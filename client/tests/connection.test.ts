import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createConnection } from '../src/connection';

// --- Mock WebSocket ---
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
  close = vi.fn();

  // Test helpers
  fire(event: string, data?: unknown) {
    for (const cb of this.listeners[event] ?? []) {
      cb(data ?? {});
    }
  }
}

Object.defineProperty(MockWebSocket, 'OPEN', { value: 1 });
Object.defineProperty(MockWebSocket, 'CLOSED', { value: 3 });

describe('createConnection', () => {
  let onMessage: ReturnType<
    typeof vi.fn<(message: import('@phalanxduel/shared').ServerMessage) => void>
  >;
  let onOpen: ReturnType<typeof vi.fn<() => void>>;
  let onClose: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    onMessage = vi.fn();
    onOpen = vi.fn();
    onClose = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function lastWs(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1]!;
  }

  it('creates a WebSocket with the given URL', () => {
    createConnection('ws://test:3001', onMessage);
    expect(lastWs().url).toBe('ws://test:3001');
  });

  it('returns object with send and close methods', () => {
    const conn = createConnection('ws://test:3001', onMessage);
    expect(typeof conn.send).toBe('function');
    expect(typeof conn.close).toBe('function');
  });

  it('calls onOpen when WebSocket opens', () => {
    createConnection('ws://test:3001', onMessage, onOpen);
    lastWs().fire('open');
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('parses JSON and calls onMessage on message event', () => {
    createConnection('ws://test:3001', onMessage);
    lastWs().fire('message', {
      data: JSON.stringify({ type: 'matchCreated', matchId: 'm1', playerId: 'p1', playerIndex: 0 }),
    });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'matchCreated', matchId: 'm1' }),
    );
  });

  it('ignores malformed JSON messages', () => {
    createConnection('ws://test:3001', onMessage);
    lastWs().fire('message', { data: 'not-json' });
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('calls onClose when WebSocket closes', () => {
    createConnection('ws://test:3001', onMessage, onOpen, onClose);
    lastWs().fire('close');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('send() serializes message', () => {
    const conn = createConnection('ws://test:3001', onMessage);
    const ws = lastWs();
    ws.readyState = MockWebSocket.OPEN;
    const msg = {
      type: 'createMatch' as const,
      playerName: 'Alice',
      gameOptions: {
        damageMode: 'classic' as const,
        startingLifepoints: 20,
        classicDeployment: true,
      },
    };
    conn.send(msg);
    const sent = JSON.parse(String(ws.send.mock.calls.at(-1)?.[0]));
    expect(sent).toMatchObject({
      ...msg,
      telemetry: {
        originService: 'phx-client',
      },
    });
  });

  it('send() does nothing when WebSocket is not OPEN', () => {
    const conn = createConnection('ws://test:3001', onMessage);
    lastWs().readyState = MockWebSocket.CLOSED;
    conn.send({
      type: 'createMatch' as const,
      playerName: 'Bob',
      gameOptions: {
        damageMode: 'classic' as const,
        startingLifepoints: 20,
        classicDeployment: true,
      },
    });
    expect(lastWs().send).not.toHaveBeenCalled();
  });

  it('reconnects after close with exponential backoff', () => {
    createConnection('ws://test:3001', onMessage, onOpen, onClose);
    expect(MockWebSocket.instances).toHaveLength(1);

    // First close → reconnect after 1000ms
    lastWs().fire('close');
    vi.advanceTimersByTime(999);
    expect(MockWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(2);

    // Second close → reconnect after 2000ms (delay doubled inside setTimeout)
    lastWs().fire('close');
    vi.advanceTimersByTime(1999);
    expect(MockWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it('caps reconnect delay at 30 seconds', () => {
    createConnection('ws://test:3001', onMessage);

    for (let i = 0; i < 20; i++) {
      lastWs().fire('close');
      vi.advanceTimersByTime(30000);
    }
    const count = MockWebSocket.instances.length;
    expect(count).toBeGreaterThan(10);
  });

  it('resets reconnect delay on successful open', () => {
    createConnection('ws://test:3001', onMessage);

    // Escalate delay
    lastWs().fire('close');
    vi.advanceTimersByTime(1000);

    // Open resets delay
    lastWs().fire('open');
    lastWs().fire('close');

    // Should reconnect after 1000ms (reset), not 2000ms
    vi.advanceTimersByTime(1000);
    const count = MockWebSocket.instances.length;
    expect(count).toBe(3);
  });

  it('sends authenticate message on open when token exists', async () => {
    // Set a token before creating the connection
    const { setToken } = await import('../src/auth');
    setToken('test-jwt-token');

    createConnection('ws://test:3001', onMessage);
    const ws = lastWs();
    ws.readyState = MockWebSocket.OPEN;
    ws.fire('open');

    const sent = JSON.parse(String(ws.send.mock.calls.at(-1)?.[0]));
    expect(sent).toMatchObject({
      type: 'authenticate',
      token: 'test-jwt-token',
      telemetry: {
        originService: 'phx-client',
      },
    });

    // Clean up
    setToken(null);
  });

  it('does not send authenticate on open when no token', () => {
    createConnection('ws://test:3001', onMessage);
    const ws = lastWs();
    ws.readyState = MockWebSocket.OPEN;
    ws.fire('open');

    expect(ws.send).not.toHaveBeenCalled();
  });

  it('updates the outgoing message telemetry with a carried qaRunId when present', () => {
    const conn = createConnection('ws://test:3001', onMessage);
    const ws = lastWs();
    ws.readyState = MockWebSocket.OPEN;
    conn.send({
      type: 'joinMatch',
      matchId: 'm-1',
      playerName: 'Alice',
      telemetry: { qaRunId: 'qa-123' },
    });

    const sent = JSON.parse(String(ws.send.mock.calls.at(-1)?.[0]));
    expect(sent).toMatchObject({
      type: 'joinMatch',
      matchId: 'm-1',
      playerName: 'Alice',
      telemetry: {
        originService: 'phx-client',
        qaRunId: 'qa-123',
      },
    });
  });

  it('close() prevents reconnection', () => {
    const conn = createConnection('ws://test:3001', onMessage);
    conn.close();

    lastWs().fire('close');
    vi.advanceTimersByTime(60000);
    expect(MockWebSocket.instances).toHaveLength(1);
  });
});
