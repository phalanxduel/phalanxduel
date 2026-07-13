/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * One information-set projection for every gameplay observer. Raw GameState is
 * an internal authority object; consumers must receive a role-relative view.
 */

import type {
  Action,
  Battlefield,
  CalculationProvenance,
  CombatResolutionContext,
  GameState,
  PhalanxEvent,
  PlayerState,
  TransactionDetail,
  TransactionLogEntry,
} from '@phalanxduel/shared';
import { isCompleted } from '@phalanxduel/shared';

export type ObserverContext =
  | { role: 'player'; playerIndex: 0 | 1 }
  | { role: 'competitive-bot'; playerIndex: 0 | 1 }
  | { role: 'spectator' }
  | { role: 'public-replay' }
  | { role: 'omniscient-research'; purpose: string };

export const PUBLIC_SPECTATOR: ObserverContext = Object.freeze({ role: 'spectator' });
export const PUBLIC_REPLAY: ObserverContext = Object.freeze({ role: 'public-replay' });

export function observerForViewer(viewerIndex: number | null): ObserverContext {
  return viewerIndex === 0 || viewerIndex === 1
    ? { role: 'player', playerIndex: viewerIndex }
    : PUBLIC_SPECTATOR;
}

export function observerPlayerIndex(observer: ObserverContext): 0 | 1 | null {
  return observer.role === 'player' || observer.role === 'competitive-bot'
    ? observer.playerIndex
    : null;
}

function hasInternalAccess(observer: ObserverContext): boolean {
  return observer.role === 'omniscient-research';
}

function terminalKnowledgeUnlocked(state: GameState, observer: ObserverContext): boolean {
  return isCompleted(state) || observer.role === 'public-replay';
}

function canSeePrivateZone(
  state: GameState,
  observer: ObserverContext,
  playerIndex: number,
): boolean {
  if (hasInternalAccess(observer) || terminalKnowledgeUnlocked(state, observer)) return true;
  return observerPlayerIndex(observer) === playerIndex;
}

function redactBattlefield(battlefield: Battlefield): Battlefield {
  return battlefield.map((cell) => {
    if (!cell?.faceDown) return cell;
    return {
      ...cell,
      card: {
        id: cell.card.id,
        suit: 'spades',
        face: '?',
        value: 0,
        type: 'number',
      },
    };
  });
}

function projectPlayerState(
  state: GameState,
  playerState: PlayerState,
  playerIndex: number,
  observer: ObserverContext,
): PlayerState {
  const privateZoneVisible = canSeePrivateZone(state, observer, playerIndex);
  const terminalOrInternal =
    terminalKnowledgeUnlocked(state, observer) || hasInternalAccess(observer);

  return {
    ...playerState,
    battlefield: terminalOrInternal
      ? playerState.battlefield
      : redactBattlefield(playerState.battlefield),
    hand: privateZoneVisible ? playerState.hand : [],
    // Draw order is hidden even from its owner during live play.
    drawpile: terminalOrInternal ? playerState.drawpile : [],
    discardPile: privateZoneVisible ? playerState.discardPile : playerState.discardPile.slice(-1),
    deckSeed: terminalOrInternal ? playerState.deckSeed : 0,
    handCount: playerState.hand.length,
    drawpileCount: playerState.drawpile.length,
    discardPileCount: playerState.discardPile.length,
  };
}

function calculationStepVisible(
  visibility: CalculationProvenance['steps'][number]['visibility'],
  observer: ObserverContext,
  attackerPlayerIndex: number,
): boolean {
  if (visibility === 'public') return true;
  if (visibility === 'internal') return hasInternalAccess(observer);
  const viewerIndex = observerPlayerIndex(observer);
  if (viewerIndex === null) return false;
  return visibility === 'attacker'
    ? viewerIndex === attackerPlayerIndex
    : viewerIndex === 1 - attackerPlayerIndex;
}

/**
 * Keep the longest observer-visible prefix. Prefix projection preserves step
 * numbering, exact prior-step references, and arithmetic closure. Once a step
 * is hidden, all dependent suffix steps are hidden too.
 */
export function projectCalculationProvenance(
  provenance: CalculationProvenance | undefined,
  observer: ObserverContext,
  attackerPlayerIndex: number,
): CalculationProvenance | undefined {
  if (!provenance) return undefined;
  if (hasInternalAccess(observer)) return provenance;

  const firstHidden = provenance.steps.findIndex(
    (step) => !calculationStepVisible(step.visibility, observer, attackerPlayerIndex),
  );
  const visibleSteps =
    firstHidden === -1 ? provenance.steps : provenance.steps.slice(0, firstHidden);
  if (visibleSteps.length === 0) return undefined;
  return { ...provenance, steps: visibleSteps };
}

function projectResolution(
  resolution: CombatResolutionContext | undefined,
  observer: ObserverContext,
  attackerPlayerIndex: number,
): CombatResolutionContext | undefined {
  if (!resolution) return undefined;
  const projected = {
    ...resolution,
    calculationProvenance: projectCalculationProvenance(
      resolution.calculationProvenance,
      observer,
      attackerPlayerIndex,
    ),
  };
  if (!projected.calculationProvenance) delete projected.calculationProvenance;
  return projected;
}

function projectTransactionDetails(
  details: TransactionDetail,
  observer: ObserverContext,
): TransactionDetail {
  if (details.type !== 'attack') return details;
  const attackerPlayerIndex = details.combat.attackerPlayerIndex;
  const combat = {
    ...details.combat,
    calculationProvenance: projectCalculationProvenance(
      details.combat.calculationProvenance,
      observer,
      attackerPlayerIndex,
    ),
  };
  if (!combat.calculationProvenance) delete combat.calculationProvenance;

  const resolution = projectResolution(details.resolution, observer, attackerPlayerIndex);
  const projected = { ...details, combat, resolution };
  if (!resolution) delete projected.resolution;
  return projected;
}

export function projectActionForObserver(action: Action, observer: ObserverContext): Action {
  if (hasInternalAccess(observer)) return action;
  if (action.type !== 'deploy' && action.type !== 'reinforce') return action;
  if (observerPlayerIndex(observer) === action.playerIndex) return action;
  return { ...action, cardId: 'redacted' };
}

export function projectTransactionLogForObserver(
  log: TransactionLogEntry[] | undefined,
  observer: ObserverContext,
  revealIntegrity = false,
): TransactionLogEntry[] | undefined {
  if (!log || hasInternalAccess(observer)) return log;

  return log.map((entry) => {
    const projected: TransactionLogEntry = {
      ...entry,
      action: projectActionForObserver(entry.action, observer),
      details: projectTransactionDetails(entry.details, observer),
      stateHashBefore: revealIntegrity ? entry.stateHashBefore : 'redacted',
      stateHashAfter: revealIntegrity ? entry.stateHashAfter : 'redacted',
    };
    if (!revealIntegrity) {
      delete projected.msgId;
      delete projected.phaseTraceDigest;
      delete projected.turnHash;
    }
    return projected;
  });
}

export function projectEventsForObserver(
  events: PhalanxEvent[],
  observer: ObserverContext,
): PhalanxEvent[] {
  if (hasInternalAccess(observer)) return events;

  return events.map((event) => {
    if (event.payload.type !== 'attack_resolved') return event;
    const resolution = event.payload as unknown as CombatResolutionContext;
    return {
      ...event,
      payload: projectResolution(
        resolution,
        observer,
        resolution.attackerPlayerIndex,
      ) as unknown as Record<string, unknown>,
    };
  });
}

/** Project an internal state into the complete knowledge available to one observer. */
export function projectGameStateForObserver(
  state: GameState,
  observer: ObserverContext,
): GameState {
  if (hasInternalAccess(observer)) return state;

  const p0 = state.players[0]!;
  const p1 = state.players[1]!;
  const { liveness: internalLiveness, ...viewerSafeState } = state;
  void internalLiveness;
  const revealTerminalEvidence = terminalKnowledgeUnlocked(state, observer);

  return {
    ...viewerSafeState,
    players: [
      projectPlayerState(state, p0, 0, observer),
      projectPlayerState(state, p1, 1, observer),
    ],
    transactionLog: projectTransactionLogForObserver(
      state.transactionLog,
      observer,
      revealTerminalEvidence,
    ),
  };
}
