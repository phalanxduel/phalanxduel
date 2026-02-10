import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('phalanx-server');

export const matchesActive = meter.createUpDownCounter('phalanx.matches.active', {
  description: 'Number of currently active matches',
});

export const actionsTotal = meter.createCounter('phalanx.actions.total', {
  description: 'Total number of game actions processed',
});

export const actionsDurationMs = meter.createHistogram('phalanx.actions.duration_ms', {
  description: 'Duration of action processing in milliseconds',
  unit: 'ms',
});

export const wsConnections = meter.createUpDownCounter('phalanx.ws.connections', {
  description: 'Number of active WebSocket connections',
});
