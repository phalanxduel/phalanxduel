/**
 * Game-specific telemetry and observability instrumentation.
 * Uses OpenTelemetry for spans/metrics and logs.
 */

import {
  TelemetryName,
  TelemetryAttribute,
  type GameState,
  type Action,
  type PhalanxTurnResult,
  isGameOver,
} from '@phalanxduel/shared';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { createCounter, createHistogram, withActiveSpan } from './observability.js';
import { emitOtlpLog } from './instrument.js';

const gameOutcomeCounter = createCounter('game.outcome', {
  description: 'Completed games partitioned by victory type and winner.',
});
const gameOutcomeTurnHistogram = createHistogram('game.outcome.turn_number', {
  description: 'Turn count distribution for completed games.',
});

/**
 * Record game outcome as custom metrics.
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
      const result = await execute();

      span.setAttributes({
        [TelemetryAttribute.TURN_NUMBER]: result.postState.turnNumber,
        [TelemetryAttribute.PHASE]: result.postState.phase,
      });

      if (isGameOver(result.postState) && result.postState.outcome) {
        recordVictory(result.postState);
      }

      return result;
    },
  );
}

/**
 * Record phase start/end as events or logs.
 */
export function recordPhaseTransition(matchId: string, from: string, to: string) {
  emitOtlpLog(SeverityNumber.INFO, 'INFO', `Transition: ${from} -> ${to}`, {
    'game.match_id': matchId,
    'game.phase.from': from,
    'game.phase.to': to,
  });
}
