/**
 * Pure deterministic combat transitions used by the authoritative resolver.
 * Keeping the transition relation explicit lets assurance tooling verify each
 * finite stage independently before reasoning about their composition.
 */

import type {
  BattlefieldCard,
  CardType,
  CombatBonusType,
  CombatLogStep,
  DamageMode,
  RulesSpecVersion,
} from '@phalanxduel/shared';

export interface CardTransitionContext {
  attackerType: CardType;
  modeClassicAces: boolean;
  modeClassicFaceCards: boolean;
  modeDamagePersistence: DamageMode;
}

export interface CardTransitionResult {
  remainingHp: number;
  carryover: number;
  destroyed: boolean;
  step: CombatLogStep;
}

export interface CardBoundaryInput {
  carryover: number;
  diamondShield: number;
  clubEligible: boolean;
  specVersion: RulesSpecVersion;
}

export interface CardBoundaryResult {
  carryover: number;
  diamondApplied: boolean;
  diamondAbsorbed: number;
  clubApplied: boolean;
  clubBonusTarget: 'destroyedCard' | 'nextCard' | null;
}

export interface PlayerBoundaryInput {
  carryover: number;
  heartShield: number;
  spadeWeapon: boolean;
  specVersion: RulesSpecVersion;
}

export interface PlayerBoundaryResult {
  damage: number;
  heartAbsorbed: number;
  bonuses: CombatBonusType[];
}

function isFaceCardEligible(attackerType: CardType, defenderType: CardType): boolean {
  if (!['jack', 'queen', 'king'].includes(defenderType)) return true;
  if (attackerType === 'queen') return defenderType === 'jack' || defenderType === 'queen';
  if (attackerType === 'jack') return defenderType === 'jack';
  return true;
}

export function resolveCardTransition(
  target: BattlefieldCard,
  incomingDamage: number,
  isFrontRank: boolean,
  context: CardTransitionContext,
): CardTransitionResult {
  const hpBefore = target.currentHp;
  const bonuses: CombatBonusType[] = [];

  if (context.modeClassicFaceCards && !isFaceCardEligible(context.attackerType, target.card.type)) {
    bonuses.push('faceCardIneligible');
    const remainingHp =
      context.modeDamagePersistence === 'cumulative'
        ? Math.max(target.currentHp - incomingDamage, 1)
        : target.currentHp;
    const absorbed = target.currentHp - remainingHp;
    return {
      remainingHp,
      carryover: 0,
      destroyed: false,
      step: {
        target: isFrontRank ? 'frontCard' : 'backCard',
        card: target.card,
        incomingDamage,
        hpBefore,
        effectiveHp: hpBefore,
        absorbed,
        overflow: 0,
        remaining: 0,
        damage: absorbed,
        hpAfter: remainingHp,
        destroyed: false,
        bonuses,
      },
    };
  }

  if (target.card.type === 'ace' && context.modeClassicAces) {
    if (context.attackerType === 'ace' && isFrontRank) {
      bonuses.push('aceVsAce');
      const absorbed = Math.min(incomingDamage, target.currentHp);
      const remainingHp = target.currentHp - absorbed;
      const carryover = incomingDamage - absorbed;
      const destroyed = remainingHp <= 0;
      return {
        remainingHp: destroyed ? 0 : remainingHp,
        carryover,
        destroyed,
        step: {
          target: 'frontCard',
          card: target.card,
          incomingDamage,
          hpBefore,
          effectiveHp: hpBefore,
          absorbed,
          overflow: carryover,
          remaining: carryover,
          damage: absorbed,
          hpAfter: destroyed ? 0 : remainingHp,
          destroyed,
          bonuses,
        },
      };
    }

    bonuses.push('aceInvulnerable');
    const absorbed = Math.min(incomingDamage, 1);
    const carryover = incomingDamage - absorbed;
    return {
      remainingHp: 1,
      carryover,
      destroyed: false,
      step: {
        target: isFrontRank ? 'frontCard' : 'backCard',
        card: target.card,
        incomingDamage,
        hpBefore,
        effectiveHp: hpBefore,
        absorbed,
        overflow: carryover,
        remaining: carryover,
        damage: absorbed,
        hpAfter: 1,
        destroyed: false,
        bonuses,
      },
    };
  }

  const absorbed = Math.min(incomingDamage, target.currentHp);
  const remainingHp = target.currentHp - absorbed;
  const carryover = incomingDamage - absorbed;
  const destroyed = remainingHp <= 0;
  return {
    remainingHp: destroyed ? 0 : remainingHp,
    carryover,
    destroyed,
    step: {
      target: isFrontRank ? 'frontCard' : 'backCard',
      card: target.card,
      incomingDamage,
      hpBefore,
      effectiveHp: hpBefore,
      absorbed,
      overflow: carryover,
      remaining: carryover,
      damage: absorbed,
      hpAfter: destroyed ? 0 : remainingHp,
      destroyed,
      bonuses,
    },
  };
}

export function resolveCardBoundary(input: CardBoundaryInput): CardBoundaryResult {
  let carryover = input.carryover;
  let diamondApplied = false;
  let diamondAbsorbed = 0;
  let clubApplied = false;

  const applyDiamond = (): void => {
    if (input.diamondShield <= 0 || carryover <= 0) return;
    diamondApplied = true;
    diamondAbsorbed = Math.min(carryover, input.diamondShield);
    carryover -= diamondAbsorbed;
  };

  if (input.specVersion !== '1.0') applyDiamond();
  if (input.clubEligible && carryover > 0) {
    carryover *= 2;
    clubApplied = true;
  }
  if (input.specVersion === '1.0') applyDiamond();

  return {
    carryover,
    diamondApplied,
    diamondAbsorbed,
    clubApplied,
    clubBonusTarget: !clubApplied ? null : carryover === 0 ? 'destroyedCard' : 'nextCard',
  };
}

export function resolvePlayerBoundary(input: PlayerBoundaryInput): PlayerBoundaryResult {
  let damage = input.carryover;
  let heartAbsorbed = 0;
  const bonuses: CombatBonusType[] = [];

  const applyHeart = (): void => {
    if (input.heartShield <= 0 || damage <= 0) return;
    heartAbsorbed = Math.min(damage, input.heartShield);
    damage -= heartAbsorbed;
    bonuses.push('heartDeathShield');
  };

  if (input.specVersion !== '1.0') applyHeart();
  if (input.spadeWeapon && damage > 0) {
    damage *= 2;
    bonuses.push('spadeDoubleLp');
  }
  if (input.specVersion === '1.0') applyHeart();

  return { damage, heartAbsorbed, bonuses };
}
