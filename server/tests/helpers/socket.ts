import { vi } from 'vitest';
import type { WebSocket } from 'ws';
import type { ServerMessage } from '@phalanxduel/shared';

export type MockSocket = WebSocket & { _messages: ServerMessage[] };

export function mockSocket(): MockSocket {
  const messages: ServerMessage[] = [];
  return {
    send: vi.fn((data: string) => messages.push(JSON.parse(data) as ServerMessage)),
    readyState: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    on: vi.fn(),
    close: vi.fn(),
    _messages: messages,
  } as unknown as MockSocket;
}

export function lastMessage(socket: MockSocket): ServerMessage | undefined {
  return socket._messages[socket._messages.length - 1];
}

