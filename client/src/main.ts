import './style.css';
import * as Sentry from "@sentry/browser";
import { createConnection } from './connection';
import { subscribe, dispatch, getState, getSavedSession, setServerHealth } from './state';
import { render, setConnection } from './renderer';
import type { ServerHealth } from './state';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions
    // Session Replay
    replaysSessionSampleRate: 1.0, // Set to 100% for development verification
    replaysOnErrorSampleRate: 1.0,
    // Setting this option to true will send default PII data to Sentry.
    sendDefaultPii: true,
    environment: import.meta.env.MODE,
  });
}

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

// ── Health signals ────────────────────────────────────────────────────────────
let wsConnected = false;
let lastDisconnectedAt: number | null = null;
let serverVersion: string | null = null;

function computeHealth(): ServerHealth {
  if (!wsConnected) {
    if (lastDisconnectedAt === null) {
      return { color: 'red', label: 'Connecting\u2026', hint: null };
    }
    return { color: 'red', label: 'Disconnected', hint: 'reconnecting\u2026' };
  }
  // WS is open — check recovery window (15 s after last drop)
  if (lastDisconnectedAt !== null && Date.now() - lastDisconnectedAt < 15_000) {
    return { color: 'yellow', label: 'Recovering', hint: 'reconnected' };
  }
  return {
    color: 'green',
    label: 'Connected',
    hint: serverVersion ? `v${serverVersion}` : null,
  };
}

function updateHealth(): void {
  setServerHealth(computeHealth());
}

// ── WebSocket connection ──────────────────────────────────────────────────────
const connection = createConnection(
  wsUrl,
  (message) => {
    dispatch(message);
  },
  () => {
    // On open
    wsConnected = true;
    updateHealth();
    // Re-evaluate once the recovery window expires (yellow → green)
    setTimeout(updateHealth, 15_000);

    // Spectator reconnect via ?watch= param
    const watchParam = new URLSearchParams(location.search).get('watch');
    if (watchParam) {
      connection.send({ type: 'watchMatch', matchId: watchParam });
      return;
    }

    // Player reconnect via stored session
    const session = getSavedSession();
    if (session && getState().screen === 'lobby') {
      connection.send({
        type: 'joinMatch',
        matchId: session.matchId,
        playerName: session.playerName || 'Player',
      });
    }
  },
  () => {
    // On close
    wsConnected = false;
    lastDisconnectedAt = Date.now();
    updateHealth();
  },
);

setConnection(connection);

// Set initial health state (red "Connecting…") immediately on load
updateHealth();

// ── Subscribe + initial render ────────────────────────────────────────────────
subscribe((state) => {
  render(state);
});

render(getState());

// ── HTTP health poll — provides version string, runs at startup + every 30 s ──
async function fetchHealth(): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('/health', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = (await res.json()) as { status: string; version: string };
      serverVersion = data.version;
      updateHealth();
    }
  } catch {
    // HTTP failure: WS connection state is the primary health signal
  }
}

void fetchHealth();
setInterval(() => {
  void fetchHealth();
}, 30_000);
