import { metrics } from '@opentelemetry/api';
import * as Sentry from '@sentry/node';

const meter = metrics.getMeter('phalanx-server');

// ─── OpenTelemetry Instruments ──────────────────────────────────────────────

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

// ─── Unified Process Tracking ───────────────────────────────────────────────

/**
 * Tracks a process boundary (entry, exit, error).
 * This records both OTel technical metrics and Sentry business metrics.
 */
export async function trackProcess<T>(
  name: string,
  tags: Record<string, string>,
  fn: () => Promise<T> | T,
): Promise<T> {
  const start = performance.now();
  
  // Record Entry
  Sentry.metrics.count(`${name}.start`, 1, { attributes: tags });

  try {
    const result = await fn();
    
    // Record Success Exit
    const duration = performance.now() - start;
    Sentry.metrics.count(`${name}.success`, 1, { attributes: tags });
    Sentry.metrics.distribution(`${name}.duration`, duration, { unit: 'millisecond', attributes: tags });
    
    return result;
  } catch (error) {
    // Record Error Exit
    const errorCode = (error as { code?: string }).code || 'unknown';
    Sentry.metrics.count(`${name}.error`, 1, { 
      attributes: { ...tags, error_code: errorCode } 
    });
    throw error;
  }
}

/**
 * Records a game state phase transition.
 */
export function recordPhaseTransition(matchId: string, from: string | null, to: string): void {
  Sentry.metrics.count('game.phase_transition', 1, {
    attributes: {
      'match.id': matchId,
      from: from ?? 'none',
      to,
    }
  });
}
