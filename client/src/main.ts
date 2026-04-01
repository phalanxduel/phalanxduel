import './instrument.js';
import './style.css';
import { createConnection } from './connection';
import { subscribe, dispatch, getState, getSavedSession, onTurnResult } from './state';
import { render, setConnection } from './renderer';
import { NarrationProducer } from './narration-producer';
import { NarrationBus } from './narration-bus';

// ── App Initialization ──────────────────────────────────────────────

async function init() {
  const root = document.getElementById('app');
  if (!root) return;
  const urlParams = new URLSearchParams(window.location.search);
  const qaRunId = urlParams.get('qaRunId')?.trim() ?? undefined;

  const bus = new NarrationBus();
  const producer = new NarrationProducer(bus);

  // Connect narration producer to state updates
  onTurnResult((result) => {
    producer.onTurnResult(result);
  });

  // Initial render
  render(getState());

  // Subscribe to state changes for re-rendering
  subscribe((state) => {
    render(state);
  });

  // 1. Restore session (User/Auth is currently handled by AuthPanel/renderer)
  getSavedSession();

  // 2. Connect to WebSocket
  try {
    const conn = createConnection(
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
      (msg) => {
        dispatch(msg);
      },
      {
        onOpen: () => {
          dispatch({ type: 'CONNECT_SUCCESS' });
        },
        onClose: () => {
          dispatch({ type: 'CONNECT_ERROR', error: 'Connection lost' });
        },
        qaRunId,
      },
    );

    // Provide connection to the renderer so it can send actions
    setConnection(conn);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    dispatch({
      type: 'CONNECT_ERROR',
      error: message,
    });
  }
}

void init();
