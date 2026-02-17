import './style.css';
import { createConnection } from './connection';
import { subscribe, dispatch, getState, getSavedSession } from './state';
import { render, setConnection } from './renderer';

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

const connection = createConnection(
  wsUrl,
  (message) => {
    dispatch(message);
  },
  () => {
    // On open: attempt reconnection if we have stored credentials
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
