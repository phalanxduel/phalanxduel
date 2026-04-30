import type { GameState } from '@phalanxduel/shared';
import type { TurningPointSummary } from '@phalanxduel/shared';

const DEFAULT_QUICK_MATCH_NAME = 'OPERATIVE';

export function getQuickMatchOperativeId(operativeId: string | null | undefined): string {
  const trimmed = operativeId?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : DEFAULT_QUICK_MATCH_NAME;
}

export function getQuickMatchPlayerName(playerName: string | null | undefined): string {
  return getQuickMatchOperativeId(playerName);
}

export function formatShareText(
  gs: GameState,
  turningPoint: TurningPointSummary | null,
  currentUrl: string,
  playerIndex: number | null,
): string {
  const outcome = gs.outcome ?? null;
  const resultLabel =
    outcome && playerIndex !== null
      ? outcome.winnerIndex === playerIndex
        ? 'Win'
        : 'Loss'
      : outcome
        ? 'Win/Loss'
        : 'Pending';

  const resultTurn = outcome ? outcome.turnNumber : (turningPoint?.turnNumber ?? gs.turnNumber);
  const turningPointLine = turningPoint
    ? `Turning Point: Turn ${turningPoint.turnNumber} — ${turningPoint.label}`
    : 'Turning Point: unavailable';

  return [
    'Phalanx Duel',
    `Result: ${resultLabel} on Turn ${resultTurn}`,
    turningPointLine,
    currentUrl,
  ].join('\n');
}
