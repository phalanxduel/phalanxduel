import './style.css';
import * as Sentry from "@sentry/browser";
import posthog from 'posthog-js';
import { createConnection } from './connection';
import { subscribe, dispatch, getState, getSavedSession, setServerHealth } from './state';
import { render, setConnection } from './renderer';
import type { ServerHealth } from './state';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;

// ── Sentry + PostHog Initialization ──────────────────────────────────────────
if (SENTRY_DSN) {
  // 1. Generate or retrieve a persistent visitor ID
  let visitorId = localStorage.getItem('phalanx_visitor_id');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('phalanx_visitor_id', visitorId);
  }

  // 2. Initialize Sentry
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0,
    // Session Replay
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: true,
    environment: import.meta.env.MODE,
  });

  // Identify the user in Sentry
  Sentry.setUser({ 
    id: visitorId,
    ip_address: "{{auto}}", 
  });

  // 3. Initialize PostHog if key is available
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_performance: true,
    });
    
    // Identify the user in PostHog
    posthog.identify(visitorId);
    
    // 4. Link PostHog session ID to Sentry scope
    const sessionId = posthog.get_session_id();
    if (sessionId) {
      Sentry.getCurrentScope().setTag('posthog_session_id', sessionId);
    }
  }

  // 5. Lazy-load Sentry Feedback integration
  // (Standard @sentry/browser provides this via integrations or lazy loading)
  // We'll keep it simple by adding it directly if needed, or use the 
  // browser's built-in feedback if configured in the dashboard.
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
