import './style.css';
import { createConnection } from './connection';
import { subscribe, dispatch } from './state';
import { render, setConnection } from './renderer';

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

const connection = createConnection(wsUrl, (message) => {
  dispatch(message);
});

setConnection(connection);

// Re-render on every state change
subscribe((state) => {
  render(state);
});

// Initial render
import { getState } from './state';
render(getState());
