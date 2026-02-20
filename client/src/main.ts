import './style.css';
import { createConnection } from './connection';
import { subscribe, dispatch, getState, getSavedSession, setServerHealth } from './state';
import { render, setConnection } from './renderer';
import type { ServerHealth } from './state';

declare global {
  interface Window {
    sentryOnLoad?: () => void;
    Sentry?: {
      init: (options: unknown) => void;
      setUser: (user: { id: string; [key: string]: unknown }) => void;
      browserTracingIntegration: () => unknown;
      replayIntegration: (options?: unknown) => unknown;
      lazyLoadIntegration: (name: string) => Promise<(options?: unknown) => unknown>;
      addIntegration: (integration: unknown) => void;
    };
    posthog?: {
      init: (key: string, options: unknown) => void;
      identify: (id: string) => void;
      capture: (event: string, properties?: unknown) => void;
    };
  }
}

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;

window.sentryOnLoad = function() {
  const Sentry = window.Sentry;
  if (!Sentry) return;

  // Generate or retrieve a persistent visitor ID
  let visitorId = localStorage.getItem('phalanx_visitor_id');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('phalanx_visitor_id', visitorId);
  }

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

  // Identify the user across all signals (Traces, Errors, Replays)
  Sentry.setUser({ 
    id: visitorId,
    ip_address: "{{auto}}", // Sentry will resolve this server-side
  });

  // Initialize PostHog if key is available
  if (POSTHOG_KEY && window.posthog) {
    window.posthog.init(POSTHOG_KEY, {
      api_host: 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_performance: true,
    });
    window.posthog.identify(visitorId);
  }

  Sentry.lazyLoadIntegration("feedbackIntegration")
    .then((feedbackIntegration) => {
      const integration = (feedbackIntegration as (options?: unknown) => unknown)({
        // User Feedback configuration options
        autoInject: true,
        showBranding: false,
      });
      Sentry.addIntegration(integration);
    })
    .catch(() => {
      // Feedback failed to load, proceed without it
    });
};

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
