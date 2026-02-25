/**
 * Game-specific telemetry and observability instrumentation.
 * Integrates with Sentry and OpenTelemetry.
 */

import * as Sentry from '@sentry/node';
import {
  TelemetryName,
  TelemetryAttribute,
  type GameState,
  type Action,
  type PhalanxTurnResult,
} from '@phalanxduel/shared';

export class GameTelemetry {
  /**
   * Wrap a game action execution in a Sentry span.
   */
  static async recordAction(
    matchId: string,
    action: Action,
    execute: () => Promise<PhalanxTurnResult> | PhalanxTurnResult,
  ): Promise<PhalanxTurnResult> {
    const spanName =
      (typeof TelemetryName !== 'undefined' && TelemetryName.SPAN_GAME_ACTION) || 'game.action';
    return Sentry.startSpan(
      {
        name: spanName,
        op: 'game.logic',
        attributes: {
          [TelemetryAttribute?.MATCH_ID || 'game.match_id']: matchId,
          [TelemetryAttribute?.ACTION_TYPE || 'game.action.type']: action.type,
          ...(action.type !== 'system:init'
            ? { [TelemetryAttribute?.PLAYER_INDEX || 'game.player_index']: action.playerIndex }
            : {}),
        },
      },
      async (span) => {
        try {
          const result = await execute();

          // Enhance span with result metadata
          span?.setAttributes({
            [(typeof TelemetryAttribute !== 'undefined' && TelemetryAttribute.TURN_NUMBER) ||
            'game.turn_number']: result.postState.turnNumber,
            [(typeof TelemetryAttribute !== 'undefined' && TelemetryAttribute.PHASE) ||
            'game.phase']: result.postState.phase,
          });

          // Record victory or stalemate events
          if (result.postState.phase === 'gameOver' && result.postState.outcome) {
            this.recordVictory(matchId, result.postState);
            if (typeof Sentry.metrics?.count === 'function') {
              Sentry.metrics.count('match.lifecycle', 1, {
                attributes: {
                  event: 'completed',
                  victory_type: result.postState.outcome.victoryType,
                },
              });
            }
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
  static recordPhaseTransition(matchId: string, from: string, to: string) {
    Sentry.addBreadcrumb({
      category: 'game.phase',
      message: `Transition: ${from} -> ${to}`,
      data: { matchId, from, to },
      level: 'info',
    });
  }

  /**
   * Record victory event.
   */
  static recordVictory(matchId: string, finalState: GameState) {
    const outcome = finalState.outcome;
    if (!outcome) return;

    Sentry.captureEvent({
      message: `Game Over: Player ${outcome.winnerIndex} wins`,
      level: 'info',
      tags: {
        [(typeof TelemetryAttribute !== 'undefined' && TelemetryAttribute.MATCH_ID) ||
        'game.match_id']: matchId,
        [(typeof TelemetryAttribute !== 'undefined' && TelemetryAttribute.VICTORY_TYPE) ||
        'game.outcome.victory_type']: outcome.victoryType,
      },
      extra: {
        winnerIndex: outcome.winnerIndex,
        turnNumber: outcome.turnNumber,
      },
    });
  }
}
