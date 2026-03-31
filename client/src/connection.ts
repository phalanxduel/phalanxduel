import type { ServerMessage, ClientMessage } from '@phalanxduel/shared';
import { getToken } from './auth';

export interface Connection {
  send(message: ClientMessage): void;
  close(): void;
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

  function connect() {
    ws = new WebSocket(url);

    ws.addEventListener('open', () => {
      reconnectDelay = 1000;
      onOpen?.();
      const authToken = getToken();
      if (authToken && ws) {
        ws.send(JSON.stringify({ type: 'authenticate', token: authToken }));
      }
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data as string) as ServerMessage;
        onMessage(data);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.addEventListener('close', () => {
      onClose?.();
      if (shouldReconnect) {
        setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          connect();
        }, reconnectDelay);
      }
    });

    ws.addEventListener('error', () => {
      // Error triggers close, reconnect handled there
    });
  }

  connect();

  return {
    send(message: ClientMessage) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    },
    close() {
      shouldReconnect = false;
      ws?.close();
    },
  };
}
