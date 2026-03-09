import type {
  PhalanxTurnResult,
  TransactionLogEntry,
  CombatLogEntry,
  CombatLogStep,
  CombatBonusType,
  GamePhase,
  Card,
  Suit,
} from '@phalanxduel/shared';
import { cardLabel } from './cards';
import type { NarrationBus, NarrationEntry } from './narration-bus';
import type { CardType } from './narration-bus';

// ── Timing Constants ─────────────────────────────

const DELAY_ATTACK = 800;
const DELAY_DESTROYED = 400;
const DELAY_OVERFLOW = 600;
const DELAY_DEPLOY = 600;
const DELAY_BONUS = 500;
const DELAY_PHASE = 400;

// ── Card Classification ──────────────────────────

function classifyCard(card: Card): CardType {
  if (card.type === 'ace') return 'ace';
  if (['jack', 'queen', 'king'].includes(card.type)) return 'face';
  return 'number';
}

// Card ID format: "timestamp::matchId::playerId::turn::shortCode::index"
// shortCode: [S|H|D|C][A|2-9|T|J|Q|K]
const SHORT_SUIT: Record<string, Suit> = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };

function parseCardId(cardId: string): { face: string; suit: Suit } | null {
  const parts = cardId.split('::');
  if (parts.length < 5) return null;
  const shortCode = parts[4]!;
  if (shortCode.length < 2) return null;
  const suit = SHORT_SUIT[shortCode[0]!];
  if (!suit) return null;
  return { face: shortCode.substring(1), suit };
}

function classifyCardId(cardId: string): { suit: Suit; cardType: CardType } {
  const parsed = parseCardId(cardId);
  if (!parsed) return { suit: 'spades', cardType: 'number' };
  const { face, suit } = parsed;
  if (face === 'A') return { suit, cardType: 'ace' };
  if (['J', 'Q', 'K'].includes(face)) return { suit, cardType: 'face' };
  return { suit, cardType: 'number' };
}

// ── Bonus Messages ───────────────────────────────

const BONUS_MESSAGES: Partial<Record<CombatBonusType, (card: string) => string>> = {
  aceInvulnerable: (card) => `${card} is invulnerable`,
  aceVsAce: (card) => `${card} breaks through invulnerability`,
  diamondDoubleDefense: () => '...halved by Diamond Defense',
  clubDoubleOverflow: () => '...doubled by Club Overflow',
  spadeDoubleLp: () => '...doubled by Spade direct strike',
};

// Bonuses that are suppressed (no narration)
const SUPPRESSED_BONUSES: Set<CombatBonusType> = new Set([
  'faceCardIneligible',
  'heartDeathShield',
  'diamondDeathShield',
]);

/**
 * NarrationProducer — converts transaction log diffs into NarrationEntry sequences.
 *
 * Hooks into the game state update flow via onTurnResult. It diffs the transaction
 * log to find new entries, converts them to narration events with appropriate timing,
 * and enqueues them on the NarrationBus.
 */
export class NarrationProducer {
  private lastLogCount = 0;
  private lastPhase: GamePhase | null = null;
  private initialized = false;

  constructor(private readonly bus: NarrationBus) {}

  onTurnResult(result: PhalanxTurnResult): void {
    const { postState } = result;

    // Seed tracking on first call — prevents replaying history
    if (!this.initialized) {
      this.lastLogCount = postState.transactionLog?.length ?? 0;
      this.lastPhase = postState.phase;
      this.initialized = true;
      return;
    }

    const entries: NarrationEntry[] = [];

    // Phase change detection
    if (postState.phase !== this.lastPhase) {
      entries.push({
        event: { type: 'phase-change', phase: postState.phase },
        delayMs: DELAY_PHASE,
      });
      this.lastPhase = postState.phase;
    }

    // Diff transaction log
    const currentLogCount = postState.transactionLog?.length ?? 0;
    if (currentLogCount > this.lastLogCount) {
      const newTxEntries = postState.transactionLog!.slice(this.lastLogCount);
      const columns = postState.params?.columns ?? 6;
      for (const txEntry of newTxEntries) {
        const produced = this.processTxEntry(txEntry, postState.players, columns);
        entries.push(...produced);
      }
      this.lastLogCount = currentLogCount;
    }

    if (entries.length > 0) {
      this.bus.enqueue(entries);
    }
  }

  private processTxEntry(
    txEntry: TransactionLogEntry,
    players: PhalanxTurnResult['postState']['players'],
    columns: number,
  ): NarrationEntry[] {
    const { action, details } = txEntry;

    // system:init has no playerIndex — skip it
    if (action.type === 'system:init') return [];

    const playerName = players[action.playerIndex]?.player.name ?? 'Unknown';

    switch (details.type) {
      case 'deploy':
        return this.processDeployEntry(
          playerName,
          action,
          { gridIndex: details.gridIndex },
          columns,
        );
      case 'pass':
        return this.processPassEntry(playerName, players);
      case 'attack':
        return this.processAttackEntry(details.combat, players);
      case 'reinforce':
      case 'forfeit':
        return [];
      default:
        return [];
    }
  }

  private processDeployEntry(
    playerName: string,
    action: TransactionLogEntry['action'],
    details: { gridIndex: number },
    columns: number,
  ): NarrationEntry[] {
    if (action.type !== 'deploy') return [];

    const cardId = action.cardId;
    const card = this.resolveCardLabel(cardId);
    const { suit, cardType } = classifyCardId(cardId);
    const column = details.gridIndex % columns;
    const row = Math.floor(details.gridIndex / columns);

    return [
      {
        event: {
          type: 'deploy',
          player: playerName,
          card,
          suit,
          cardType,
          column,
          row,
        },
        delayMs: DELAY_DEPLOY,
      },
    ];
  }

  private processPassEntry(
    _playerName: string,
    _players: PhalanxTurnResult['postState']['players'],
  ): NarrationEntry[] {
    // Pass is an internal turn-alternation mechanic, not a meaningful player action.
    // Suppress in all phases to keep narration focused on actual game events.
    return [];
  }

  private processAttackEntry(
    combat: CombatLogEntry,
    players: PhalanxTurnResult['postState']['players'],
  ): NarrationEntry[] {
    const entries: NarrationEntry[] = [];
    const defenderIdx = combat.attackerPlayerIndex === 0 ? 1 : 0;
    const defenderName = players[defenderIdx]?.player.name ?? 'Opponent';
    const attackerLabel = cardLabel(combat.attackerCard);
    const attackerSuit = combat.attackerCard.suit;
    const attackerCardType = classifyCard(combat.attackerCard);

    for (const step of combat.steps) {
      // Check for suppressed bonuses
      if (this.hasSuppressedBonusOnly(step)) continue;

      // Zero damage with no bonus — suppress entirely
      if (step.damage === 0 && !this.hasNarratableBonus(step)) continue;

      // Generate bonus callouts for zero-damage steps with bonuses
      if (step.damage === 0 && this.hasNarratableBonus(step)) {
        entries.push(...this.generateBonusEntries(step, attackerSuit));
        continue;
      }

      const targetSuit = step.card?.suit;
      const targetCardType = step.card ? classifyCard(step.card) : undefined;

      // Normal damage steps
      switch (step.target) {
        case 'frontCard':
        case 'backCard': {
          const targetLabel = step.card ? cardLabel(step.card) : 'card';

          if (step.target === 'backCard') {
            entries.push({
              event: {
                type: 'overflow',
                target: targetLabel,
                damage: step.damage,
                suit: targetSuit,
              },
              delayMs: DELAY_OVERFLOW,
            });
          } else {
            entries.push({
              event: {
                type: 'attack',
                attacker: attackerLabel,
                target: targetLabel,
                damage: step.damage,
                suit: attackerSuit,
                cardType: attackerCardType,
              },
              delayMs: DELAY_ATTACK,
            });
          }

          if (step.destroyed) {
            entries.push({
              event: {
                type: 'destroyed',
                card: targetLabel,
                suit: targetSuit,
                cardType: targetCardType,
              },
              delayMs: DELAY_DESTROYED,
            });
          }

          if (this.hasNarratableBonus(step)) {
            entries.push(...this.generateBonusEntries(step, attackerSuit));
          }
          break;
        }
        case 'playerLp': {
          entries.push({
            event: {
              type: 'lp-damage',
              player: defenderName,
              damage: step.damage,
              suit: attackerSuit,
            },
            delayMs: DELAY_ATTACK,
          });

          if (this.hasNarratableBonus(step)) {
            entries.push(...this.generateBonusEntries(step, attackerSuit));
          }
          break;
        }
      }
    }

    return entries;
  }

  private hasSuppressedBonusOnly(step: CombatLogStep): boolean {
    const bonuses = step.bonuses ?? [];
    if (bonuses.length === 0) return false;
    return bonuses.every((b) => SUPPRESSED_BONUSES.has(b));
  }

  private hasNarratableBonus(step: CombatLogStep): boolean {
    const bonuses = step.bonuses ?? [];
    return bonuses.some((b) => !SUPPRESSED_BONUSES.has(b) && BONUS_MESSAGES[b] !== undefined);
  }

  private generateBonusEntries(step: CombatLogStep, attackerSuit?: Suit): NarrationEntry[] {
    const bonuses = step.bonuses ?? [];
    const cardLbl = step.card ? cardLabel(step.card) : 'card';
    const stepSuit = step.card?.suit ?? attackerSuit;
    const stepCardType = step.card ? classifyCard(step.card) : undefined;
    const entries: NarrationEntry[] = [];

    for (const bonus of bonuses) {
      if (SUPPRESSED_BONUSES.has(bonus)) continue;
      const msgFn = BONUS_MESSAGES[bonus];
      if (!msgFn) continue;

      entries.push({
        event: {
          type: 'bonus',
          bonus,
          card: cardLbl,
          message: msgFn(cardLbl),
          suit: stepSuit,
          cardType: stepCardType,
        },
        delayMs: DELAY_BONUS,
      });
    }

    return entries;
  }

  private resolveCardLabel(cardId: string): string {
    const parsed = parseCardId(cardId);
    if (!parsed) return cardId;
    return cardLabel({ face: parsed.face, suit: parsed.suit } as Card);
  }
}
