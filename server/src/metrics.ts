import { metrics } from '@opentelemetry/api';
import * as Sentry from '@sentry/node';
import type { TransactionLogEntry } from '@phalanxduel/shared';
import { posthog } from './instrument.js';

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
  if (posthog) {
    posthog.capture({
      distinctId: tags['player.id'] || tags['match.id'] || 'server',
      event: `${name}_started`,
      properties: tags
    });
  }

  try {
    const result = await fn();
    
    // Record Success Exit
    const duration = performance.now() - start;
    Sentry.metrics.count(`${name}.success`, 1, { attributes: tags });
    Sentry.metrics.distribution(`${name}.duration`, duration, { unit: 'millisecond', attributes: tags });
    
    if (posthog) {
      posthog.capture({
        distinctId: tags['player.id'] || tags['match.id'] || 'server',
        event: `${name}_completed`,
        properties: { ...tags, duration_ms: duration }
      });
    }

    return result;
  } catch (error) {
    // Record Error Exit
    const errorCode = (error as { code?: string }).code || 'unknown';
    Sentry.metrics.count(`${name}.error`, 1, { 
      attributes: { ...tags, error_code: errorCode } 
    });
    
    if (posthog) {
      posthog.capture({
        distinctId: tags['player.id'] || tags['match.id'] || 'server',
        event: `${name}_failed`,
        properties: { ...tags, error_code: errorCode }
      });
    }

    throw error;
  }
}

/**
 * Records a game action event as a Sentry breadcrumb and (for high-value events)
 * a PostHog capture. Called after each successful applyAction in handleAction.
 * Breadcrumbs are free in production — they are only sent when an error occurs,
 * providing complete pre-error game context.
 */
export function recordGameEvent(
  entry: TransactionLogEntry,
  matchId: string,
  playerId: string,
): void {
  const { details } = entry;
  const base = { matchId, playerId, turn: entry.sequenceNumber };

  switch (details.type) {
    case 'deploy': {
      Sentry.addBreadcrumb({
        category: 'game.deploy',
        message: `Deployed to grid[${details.gridIndex}] → ${details.phaseAfter}`,
        data: { ...base, gridIndex: details.gridIndex, phaseAfter: details.phaseAfter },
        level: 'info',
      });
      break;
    }

    case 'attack': {
      const { combat } = details;
      const cardsDestroyed = combat.steps.filter((s) => s.destroyed).length;
      Sentry.addBreadcrumb({
        category: 'game.attack',
        message: [
          `col:${combat.targetColumn}`,
          `dmg:${combat.baseDamage}`,
          `destroyed:${cardsDestroyed}`,
          `lpDmg:${combat.totalLpDamage}`,
          details.reinforcementTriggered ? '[reinforce]' : '',
          details.victoryTriggered ? '[VICTORY]' : '',
        ].filter(Boolean).join(' '),
        data: {
          ...base,
          attackerCard: `${combat.attackerCard.rank}${combat.attackerCard.suit[0]}`,
          targetColumn: combat.targetColumn,
          baseDamage: combat.baseDamage,
          cardsDestroyed,
          lpDamage: combat.totalLpDamage,
          reinforcementTriggered: details.reinforcementTriggered,
          victoryTriggered: details.victoryTriggered,
        },
        level: details.victoryTriggered ? 'warning' : 'info',
      });
      if (posthog) {
        posthog.capture({
          distinctId: matchId,
          event: 'game_attack',
          properties: {
            ...base,
            attackerSuit: combat.attackerCard.suit,
            attackerRank: combat.attackerCard.rank,
            targetColumn: combat.targetColumn,
            baseDamage: combat.baseDamage,
            cardsDestroyed,
            lpDamage: combat.totalLpDamage,
            stepCount: combat.steps.length,
            reinforcementTriggered: details.reinforcementTriggered,
            victoryTriggered: details.victoryTriggered,
          },
        });
      }
      break;
    }

    case 'reinforce': {
      Sentry.addBreadcrumb({
        category: 'game.reinforce',
        message: `Reinforced col:${details.column} grid[${details.gridIndex}]${details.reinforcementComplete ? ' [complete]' : ''}`,
        data: {
          ...base,
          column: details.column,
          gridIndex: details.gridIndex,
          reinforcementComplete: details.reinforcementComplete,
        },
        level: 'info',
      });
      break;
    }

    case 'forfeit': {
      Sentry.addBreadcrumb({
        category: 'game.forfeit',
        message: `Player forfeited — winner: player[${details.winnerIndex}]`,
        data: { ...base, winnerIndex: details.winnerIndex },
        level: 'warning',
      });
      if (posthog) {
        posthog.capture({
          distinctId: matchId,
          event: 'game_forfeit',
          properties: { ...base, winnerIndex: details.winnerIndex },
        });
      }
      break;
    }

    case 'pass':
      // Passes are high-frequency and low-signal; tracked via phase transition metrics only.
      break;
  }
}

/**
 * Records a game state phase transition.
 */
export function recordPhaseTransition(matchId: string, from: string | null, to: string): void {
  const attributes = {
    'match.id': matchId,
    from: from ?? 'none',
    to,
  };
  Sentry.metrics.count('game.phase_transition', 1, { attributes });
  
  if (posthog) {
    posthog.capture({
      distinctId: matchId,
      event: 'game_phase_transitioned',
      properties: attributes
    });
  }
}
