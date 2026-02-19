import './style.css';
import { createConnection } from './connection';
import { subscribe, dispatch, getState, getSavedSession, setServerHealth } from './state';
import { render, setConnection } from './renderer';

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

const connection = createConnection(
  wsUrl,
  (message) => {
    dispatch(message);
  },
  () => {
    // On open: if ?watch= param is set, join as spectator (handles initial visit + reconnect)
    const watchParam = new URLSearchParams(location.search).get('watch');
    if (watchParam) {
      connection.send({ type: 'watchMatch', matchId: watchParam });
      return;
    }

    // Attempt reconnection if we have stored credentials
    const session = getSavedSession();
    if (session && getState().screen === 'lobby') {
      connection.send({
        type: 'joinMatch',
        matchId: session.matchId,
        playerName: session.playerName || 'Player',
      });
    }
  },
);

setConnection(connection);

// Re-render on every state change
subscribe((state) => {
  render(state);
});

// Initial render
render(getState());

// Fetch server health once at startup — populates the lobby status indicator
void (async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('/health', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json() as { status: string; version: string };
      setServerHealth({ reachable: true, status: data.status, version: data.version });
    } else {
      setServerHealth({ reachable: false });
    }
  } catch {
    setServerHealth({ reachable: false });
  }
})();
