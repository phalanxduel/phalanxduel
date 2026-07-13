import type {
  PhalanxTurnResult,
  TransactionLogEntry,
  CombatLogStep,
  CombatBonusType,
  GamePhase,
  Card,
  Suit,
} from '@phalanxduel/shared';
import { readCombatResolution } from '@phalanxduel/shared';
import { isGameOver } from '@phalanxduel/shared';
import { cardLabel } from './cards';
import type { NarrationBus, NarrationEntry } from './narration-bus';
import type { CardType } from './narration-bus';
import { buildCombatExplanation, explanationLinesForMode } from './combat-explanation';
import { PRESENTATION_TIMING } from './presentation-timing';

// ── Timing Constants ─────────────────────────────

const DELAY_ATTACK = PRESENTATION_TIMING.cue.attack;
const DELAY_DESTROYED = PRESENTATION_TIMING.cue.destroyed;
const DELAY_OVERFLOW = PRESENTATION_TIMING.cue.overflow;
const DELAY_DEPLOY = PRESENTATION_TIMING.cue.deploy;
const DELAY_BONUS = PRESENTATION_TIMING.cue.bonus;
const DELAY_PHASE = PRESENTATION_TIMING.cue.phase;
const DELAY_CALCULATION = PRESENTATION_TIMING.cue.calculation;
const DELAY_TERMINAL = PRESENTATION_TIMING.cue.terminal;

// ── Card Classification ──────────────────────────

function classifyCard(card: Card): CardType {
  if (card.type === 'ace') return 'ace';
  if (['jack', 'queen', 'king'].includes(card.type)) return 'face';
  return 'number';
}

// ── Card Lookup ─────────────────────────────────
// Card IDs are opaque — look up card data from game state instead of parsing IDs.

// ── Bonus Messages ───────────────────────────────

const BONUS_MESSAGES: Partial<Record<CombatBonusType, (card: string) => string>> = {
  aceInvulnerable: (card) => `${card} is invulnerable`,
  aceVsAce: (card) => `${card} breaks through invulnerability`,
  diamondDoubleDefense: () => '...absorbed by Diamond Defense',
  clubDoubleOverflow: () => '...doubled by Club Overflow',
  spadeDoubleLp: () => '...doubled by Spade direct strike',
  heartDeathShield: (card) => `${card} survives — Heart Shield`,
  diamondDeathShield: (card) => `${card} survives — Diamond Shield`,
};

// Bonuses that are suppressed (no narration)
const SUPPRESSED_BONUSES = new Set<CombatBonusType>(['faceCardIneligible']);

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

    const phaseChanged = postState.phase !== this.lastPhase;

    // Diff transaction log
    const currentLogCount = postState.transactionLog?.length ?? 0;
    if (currentLogCount > this.lastLogCount) {
      const newTxEntries = postState.transactionLog?.slice(this.lastLogCount) ?? [];

      const columns = postState.params?.columns ?? 6;
      for (const txEntry of newTxEntries) {
        const produced = this.processTxEntry(txEntry, postState.players, columns);
        entries.push(...produced);
      }
      this.lastLogCount = currentLogCount;
    }

    // Presentation order is causal: resolve the transaction first, then
    // announce its resulting phase or terminal verdict.
    if (phaseChanged) {
      if (isGameOver(postState) && postState.outcome) {
        entries.push({
          event: {
            type: 'terminal',
            winnerIndex: postState.outcome.winnerIndex,
            turnNumber: postState.outcome.turnNumber,
            victoryType: postState.outcome.victoryType,
          },
          delayMs: DELAY_TERMINAL,
        });
      } else {
        entries.push({
          event: { type: 'phase-change', phase: postState.phase },
          delayMs: DELAY_PHASE,
        });
      }
      this.lastPhase = postState.phase;
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
        return this.processDeployEntry(playerName, action, {
          gridIndex: details.gridIndex,
          columns,
          players,
        });
      case 'pass':
        return this.processPassEntry(playerName, players);
      case 'attack':
        return this.processAttackEntry(details, players);
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
    ctx: {
      gridIndex: number;
      columns: number;
      players: PhalanxTurnResult['postState']['players'];
    },
  ): NarrationEntry[] {
    if (action.type !== 'deploy') return [];

    // Look up the deployed card from the battlefield (post-state) instead of parsing the ID.
    const bfCard = ctx.players[action.playerIndex]?.battlefield[ctx.gridIndex];
    const cardObj = bfCard?.card;
    const card = cardObj ? cardLabel(cardObj) : 'card';
    const suit = cardObj?.suit ?? 'spades';
    const cardType = cardObj ? classifyCard(cardObj) : 'number';
    const column = ctx.gridIndex % ctx.columns;
    const row = Math.floor(ctx.gridIndex / ctx.columns);

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
    details: Extract<TransactionLogEntry['details'], { type: 'attack' }>,
    players: PhalanxTurnResult['postState']['players'],
  ): NarrationEntry[] {
    const { combat, victoryTriggered } = details;
    const resolution = readCombatResolution(details);
    const entries: NarrationEntry[] = [];
    const defenderIdx = resolution.attackerPlayerIndex === 0 ? 1 : 0;
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
            // Check for Ace vs Ace cinematic trigger
            if (attackerCardType === 'ace' && targetCardType === 'ace') {
              entries.push({
                event: {
                  type: 'cinematic',
                  style: 'clash',
                  message: 'CLASH OF ACES',
                  submessage: `${attackerLabel} vs ${targetLabel}`,
                  suit: attackerSuit,
                },
                delayMs: 2500, // Show clash longer
              });
            }

            entries.push({
              event: {
                type: 'attack',
                attacker: attackerLabel,
                target: targetLabel,
                damage: step.damage,
                suit: attackerSuit,
                cardType: attackerCardType,
                targetCardType: targetCardType,
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

          // ponytail: cinematic for the killing blow
          if (victoryTriggered) {
            entries.push({
              event: {
                type: 'cinematic',
                style: 'lethal',
                message: 'LETHAL DAMAGE',
                submessage: `${attackerLabel} finishes ${defenderName}`,
                suit: attackerSuit,
              },
              delayMs: PRESENTATION_TIMING.cue.cinematic,
            });
          }

          if (this.hasNarratableBonus(step)) {
            entries.push(...this.generateBonusEntries(step, attackerSuit));
          }
          break;
        }
      }
    }

    if (combat.comboCount && combat.comboCount > 1) {
      entries.push({
        event: {
          type: 'combo',
          count: combat.comboCount,
          suit: attackerSuit,
        },
        delayMs: DELAY_BONUS,
      });
    }

    const explanation = buildCombatExplanation(resolution.calculationProvenance);
    if (explanation) {
      for (const line of explanationLinesForMode(explanation, 'tactical')) {
        entries.push({
          event: {
            type: 'calculation',
            sequence: line.sequence,
            ruleId: line.ruleId,
            equation: line.expression,
            spoken: line.spoken,
          },
          delayMs: DELAY_CALCULATION,
        });
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
}
