/**
 * Game-specific telemetry and observability instrumentation.
 * Uses OpenTelemetry for spans/metrics and Sentry for errors/breadcrumbs.
 */

import * as Sentry from '@sentry/node';
import {
  TelemetryName,
  TelemetryAttribute,
  type GameState,
  type Action,
  type PhalanxTurnResult,
} from '@phalanxduel/shared';
import { createCounter, createHistogram, withActiveSpan } from './observability.js';

const gameOutcomeCounter = createCounter('game.outcome', {
  description: 'Completed games partitioned by victory type and winner.',
});
const gameOutcomeTurnHistogram = createHistogram('game.outcome.turn_number', {
  description: 'Turn count distribution for completed games.',
});

/**
 * Record game outcome as custom metrics.
 *
 * Uses metrics — not captureEvent — so outcomes appear on dashboards and
 * feed SLO alerts rather than polluting the Sentry issue tracker.
 *
 * Metrics emitted:
 *   game.outcome              — increment by victory_type (SLI: outcome distribution)
 *   game.outcome.turn_number  — distribution by victory_type (SLI: game length)
 */
function recordVictory(finalState: GameState) {
  const outcome = finalState.outcome;
  if (!outcome) return;

  gameOutcomeCounter.add(1, {
    victory_type: outcome.victoryType,
    winner: String(outcome.winnerIndex),
  });
  gameOutcomeTurnHistogram.record(outcome.turnNumber, {
    victory_type: outcome.victoryType,
  });
}

/**
 * Wrap a game action execution in an active OTel span.
 */
export async function recordAction(
  matchId: string,
  action: Action,
  execute: () => Promise<PhalanxTurnResult> | PhalanxTurnResult,
): Promise<PhalanxTurnResult> {
  const spanName = TelemetryName.SPAN_GAME_ACTION;
  return withActiveSpan(
    spanName,
    {
      attributes: {
        [TelemetryAttribute.MATCH_ID]: matchId,
        [TelemetryAttribute.ACTION_TYPE]: action.type,
        'phalanx.span.op': 'game.logic',
        ...(action.type !== 'system:init'
          ? { [TelemetryAttribute.PLAYER_INDEX]: action.playerIndex }
          : {}),
      },
    },
    async (span) => {
      try {
        const result = await execute();

        span.setAttributes({
          [TelemetryAttribute.TURN_NUMBER]: result.postState.turnNumber,
          [TelemetryAttribute.PHASE]: result.postState.phase,
        });

        if (result.postState.phase === 'gameOver' && result.postState.outcome) {
          recordVictory(result.postState);
        }

        return result;
      } catch (error) {
        Sentry.captureException(error, {
          extra: { matchId, action },
        });
        throw error;
      }
    },
  );
}

/**
 * Record phase start/end as breadcrumbs or events.
 */
export function recordPhaseTransition(matchId: string, from: string, to: string) {
  Sentry.addBreadcrumb({
    category: 'game.phase',
    message: `Transition: ${from} -> ${to}`,
    data: { matchId, from, to },
    level: 'info',
  });
}
