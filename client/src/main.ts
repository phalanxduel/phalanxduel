import './style.css';
import * as Sentry from '@sentry/browser';
import { createConnection } from './connection';
import {
  subscribe,
  dispatch,
  getState,
  getSavedSession,
  setServerHealth,
  onTurnResult,
} from './state';
import { render, setConnection } from './renderer';
import { PizzazzEngine } from './pizzazz';
import { NarrationBus } from './narration-bus';
import { NarrationProducer } from './narration-producer';
import { NarrationOverlay } from './narration-overlay';
import { NarrationTicker } from './narration-ticker';
import type { ServerHealth } from './state';
import { trackClientEvent } from './analytics';
import {
  getLobbyFrameworkPreactPercent,
  getLobbyFrameworkVariant,
  isPreactLobbyExperimentEnabled,
} from './experiments';

const SENTRY_DSN = import.meta.env['VITE_SENTRY_DSN'];
const localSentryEnabled =
  import.meta.env['VITE_ENABLE_LOCAL_SENTRY'] === '1' ||
  import.meta.env['VITE_ENABLE_LOCAL_SENTRY']?.toLowerCase() === 'true';
const sentryEnabled = !!SENTRY_DSN && (!import.meta.env.DEV || localSentryEnabled);

// ── Sentry Initialization ──────────────────────────────────────────
if (sentryEnabled) {
  // 1. Generate or retrieve a persistent visitor ID
  let visitorId = localStorage.getItem('phalanx_visitor_id');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('phalanx_visitor_id', visitorId);
  }

  // 2. Initialize Sentry
  Sentry.init({
    dsn: SENTRY_DSN,
    release: `phalanxduel-client@${__APP_VERSION__}`,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
      Sentry.feedbackIntegration({
        colorScheme: 'system',
        isNameRequired: true,
        isEmailRequired: true,
      }),
      Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost', /^https:\/\/phalanxduel\.fly\.dev/],
    // Session Replay
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: true,
    environment: import.meta.env.MODE,
    _experiments: { enableLogs: true },
  });

  // Identify the user in Sentry
  Sentry.setUser({
    id: visitorId,
    ip_address: '{{auto}}',
  });

  // 3. Lazy-load Sentry Feedback integration
  // (Standard @sentry/browser provides this via integrations or lazy loading)
  // We'll keep it simple by adding it directly if needed, or use the
  // browser's built-in feedback if configured in the dashboard.

  // ── Sentry Validation Trigger ──────────────────────────────────────────────

  window.triggerSentryError = () => {
    Sentry.metrics.count('test_counter', 1);
    window.myUndefinedFunction!();
  };

  // ── Sentry Toolbar (development only) ──────────────────────────────────────
  // Loaded from CDN to keep it out of the production bundle.
  // Requires Sentry login — harmless to non-org visitors but kept dev-only
  // to avoid a floating widget in the production game UI.
  if (import.meta.env.DEV) {
    const script = document.createElement('script');
    script.src = 'https://browser.sentry-cdn.com/sentry-toolbar/latest/toolbar.min.js';
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', () => {
      window.SentryToolbar?.init({
        organizationSlug: 'mike-hall',
        projectIdOrSlug: 'phalanxduel-client',
        environment: import.meta.env.MODE,
        sentryOrigin: 'https://mike-hall.sentry.io',
      });
    });
    document.head.appendChild(script);
  }
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

// ── Pizzazz (event-driven animation overlays) ────────────────────────────────
const pizzazz = new PizzazzEngine();
onTurnResult((result) => pizzazz.onTurnResult(result));

// ── Narration system (bus → producer → overlay + ticker) ─────────────────────
const narrationBus = new NarrationBus();
const narrationProducer = new NarrationProducer(narrationBus);
const narrationOverlay = new NarrationOverlay(narrationBus);
const narrationTicker = new NarrationTicker(narrationBus);
onTurnResult((result) => narrationProducer.onTurnResult(result));
narrationOverlay.start();
narrationTicker.start();

// Set initial health state (red "Connecting…") immediately on load
updateHealth();

// ── Subscribe + initial render ────────────────────────────────────────────────
subscribe((state) => {
  render(state);
});

render(getState());

trackClientEvent('lobby_framework_exposure', {
  variant: getLobbyFrameworkVariant(),
  preact_enabled: isPreactLobbyExperimentEnabled(),
  preact_percent: getLobbyFrameworkPreactPercent(),
});

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
