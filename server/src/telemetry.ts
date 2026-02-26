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

          // Record victory metrics
          if (result.postState.phase === 'gameOver' && result.postState.outcome) {
            this.recordVictory(result.postState);
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
   * Record game outcome as custom metrics.
   *
   * Uses metrics — not captureEvent — so outcomes appear on dashboards and
   * feed SLO alerts rather than polluting the Sentry issue tracker.
   *
   * Metrics emitted:
   *   game.outcome              — increment by victory_type (SLI: outcome distribution)
   *   game.outcome.turn_number  — distribution by victory_type (SLI: game length)
   */
  static recordVictory(finalState: GameState) {
    const outcome = finalState.outcome;
    if (!outcome) return;

    if (typeof Sentry.metrics?.count === 'function') {
      Sentry.metrics.count('game.outcome', 1, {
        attributes: {
          victory_type: outcome.victoryType,
          winner: String(outcome.winnerIndex),
        },
      });
    }
    if (typeof Sentry.metrics?.distribution === 'function') {
      Sentry.metrics.distribution('game.outcome.turn_number', outcome.turnNumber, {
        attributes: { victory_type: outcome.victoryType },
      });
    }
  }
}
