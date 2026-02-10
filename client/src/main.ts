import './style.css';
import { createConnection } from './connection';
import { subscribe, dispatch } from './state';
import { render, setConnection } from './renderer';

const wsUrl = `ws://${window.location.hostname}:3001/ws`;

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
