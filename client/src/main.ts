import './instrument.js';
import './style.css';
import { createConnection } from './connection';
import {
  subscribe,
  dispatch,
  getState,
  getSavedSession,
  onTurnResult,
  setIsMobile,
  syncStateFromUrl,
} from './state';
import { render, setConnection } from './renderer';
import { NarrationProducer } from './narration-producer';
import { NarrationBus } from './narration-bus';
import { PizzazzEngine } from './pizzazz';
import { fetchCardsManifest } from './manifest';

// ── App Initialization ──────────────────────────────────────────────

async function init() {
  const root = document.getElementById('app');
  if (!root) return;

  // Handle mobile detection
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 900);
  };
  checkMobile();
  window.addEventListener('resize', checkMobile);

  // Browser back/forward button support
  window.addEventListener('popstate', syncStateFromUrl);

  const urlParams = new URLSearchParams(window.location.search);
  const qaRunId = urlParams.get('qaRunId')?.trim() ?? undefined;

  const bus = new NarrationBus();
  const producer = new NarrationProducer(bus);
  const pizzazz = new PizzazzEngine();

  // Connect narration producer and pizzazz to state updates
  onTurnResult((result) => {
    producer.onTurnResult(result);
    pizzazz.onTurnResult(result);
  });

  // Fetch card manifest in the background — cards.ts helpers use it for display metadata.
  void fetchCardsManifest();

  // Initial render
  render(getState());

  // Subscribe to state changes for re-rendering
  subscribe((state) => {
    render(state);
    if (
      typeof window !== 'undefined' &&
      (state.screen === 'game' || state.screen === 'gameOver') &&
      state.gameState
    ) {
      const win = window as Window & { stateHistory?: unknown[] };
      if (!win.stateHistory) {
        win.stateHistory = [];
      }
      const history = win.stateHistory;
      const lastState = history[history.length - 1];
      if (!lastState || JSON.stringify(lastState) !== JSON.stringify(state.gameState)) {
        history.push(JSON.parse(JSON.stringify(state.gameState)));
      }
    }
  });

  // 1. Restore session (User/Auth is currently handled by AuthPanel/renderer)
  getSavedSession();

  // 2. Connect to WebSocket
  try {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    console.log(`[main] Connecting to WebSocket: ${wsUrl}`);

    const conn = createConnection(
      wsUrl,
      (msg) => {
        dispatch(msg);
      },
      {
        onStateChange: (state) => {
          dispatch({
            type: 'CONNECTION_STATE',
            state,
            ...(state === 'DISCONNECTED' ? { error: 'Connection lost. Reconnecting...' } : {}),
          });
        },
        qaRunId,
      },
    );

    // Provide connection to the renderer so it can send actions
    setConnection(conn);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    dispatch({
      type: 'CONNECTION_STATE',
      state: 'DISCONNECTED',
      error: message,
    });
  }
}

void init();
