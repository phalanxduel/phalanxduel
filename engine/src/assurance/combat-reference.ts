/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Independent executable interpretation of RULES.md §§8-12.
 *
 * This module intentionally imports only shared data types. It must not import
 * production combat helpers: the CI verifier relies on implementation
 * independence when it compares this model with engine/src/combat.ts.
 */

import type {
  BattlefieldCard,
  Card,
  CardType,
  CombatBonusType,
  CombatLogEntry,
  CombatLogStep,
  DamageMode,
  RulesSpecVersion,
} from '@phalanxduel/shared';

export interface ReferenceCombatModes {
  specVersion: RulesSpecVersion;
  modeClassicAces: boolean;
  modeClassicFaceCards: boolean;
  modeDamagePersistence: DamageMode;
}

export interface ReferenceCombatInput extends ReferenceCombatModes {
  attacker: BattlefieldCard;
  front: BattlefieldCard | null;
  back: BattlefieldCard | null;
  defenderLp: number;
}

export interface ReferenceCombatResult {
  front: BattlefieldCard | null;
  back: BattlefieldCard | null;
  newLp: number;
  discarded: Card[];
  combatEntry: CombatLogEntry;
}

export interface ReferenceCardTransitionResult {
  remainingHp: number;
  carryover: number;
  destroyed: boolean;
  step: CombatLogStep;
}

export interface ReferenceCardBoundaryInput {
  carryover: number;
  diamondShield: number;
  clubEligible: boolean;
  specVersion: RulesSpecVersion;
}

export interface ReferenceCardBoundaryResult {
  carryover: number;
  diamondApplied: boolean;
  diamondAbsorbed: number;
  clubApplied: boolean;
  clubBonusTarget: 'destroyedCard' | 'nextCard' | null;
}

export interface ReferencePlayerBoundaryInput {
  carryover: number;
  heartShield: number;
  spadeWeapon: boolean;
  specVersion: RulesSpecVersion;
}

export interface ReferencePlayerBoundaryResult {
  damage: number;
  heartAbsorbed: number;
  bonuses: CombatBonusType[];
}

interface PrefixState {
  carryover: number;
  clubDoubled: boolean;
  diamondApplied: boolean;
  lastDestroyed: Card | null;
  legacyHeartShield: number;
}

interface FrontBoundaryInput {
  carryover: number;
  attacker: BattlefieldCard;
  destroyedFront: Card | null;
  frontSlotWasEmpty: boolean;
  nextTargetIsCard: boolean;
  modes: ReferenceCombatModes;
  frontStep?: CombatLogStep;
}

function isFaceCardEligible(attackerType: CardType, defenderType: CardType): boolean {
  if (!['jack', 'queen', 'king'].includes(defenderType)) return true;
  if (attackerType === 'king') return true;
  if (attackerType === 'queen') return defenderType === 'jack' || defenderType === 'queen';
  if (attackerType === 'jack') return defenderType === 'jack';
  return true;
}

export function resolveReferenceCardTransition(
  target: BattlefieldCard,
  incomingDamage: number,
  attackerType: CardType,
  isFrontRank: boolean,
  modes: ReferenceCombatModes,
): ReferenceCardTransitionResult {
  const hpBefore = target.currentHp;
  const bonuses: CombatBonusType[] = [];

  if (modes.modeClassicFaceCards && !isFaceCardEligible(attackerType, target.card.type)) {
    bonuses.push('faceCardIneligible');
    const remainingHp =
      modes.modeDamagePersistence === 'cumulative'
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

  if (target.card.type === 'ace' && modes.modeClassicAces) {
    if (attackerType === 'ace' && isFrontRank) {
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

export function resolveReferenceCardBoundary(
  input: ReferenceCardBoundaryInput,
): ReferenceCardBoundaryResult {
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

  if (input.specVersion === '2.0') applyDiamond();
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
    clubBonusTarget: !clubApplied
      ? null
      : input.specVersion === '1.0' && diamondApplied && carryover === 0
        ? 'destroyedCard'
        : 'nextCard',
  };
}

export function resolveReferencePlayerBoundary(
  input: ReferencePlayerBoundaryInput,
): ReferencePlayerBoundaryResult {
  let damage = input.carryover;
  let heartAbsorbed = 0;
  const bonuses: CombatBonusType[] = [];

  const applyHeart = (): void => {
    if (input.heartShield <= 0 || damage <= 0) return;
    heartAbsorbed = Math.min(damage, input.heartShield);
    damage -= heartAbsorbed;
    bonuses.push('heartDeathShield');
  };

  if (input.specVersion === '2.0') applyHeart();
  if (input.spadeWeapon && damage > 0) {
    damage *= 2;
    bonuses.push('spadeDoubleLp');
  }
  if (input.specVersion === '1.0') applyHeart();

  return { damage, heartAbsorbed, bonuses };
}

function applyFrontToBackBoundary(input: FrontBoundaryInput): PrefixState {
  const clubBoundaryEligible =
    input.destroyedFront !== null || (input.modes.specVersion === '1.0' && input.frontSlotWasEmpty);
  const boundary = resolveReferenceCardBoundary({
    carryover: input.carryover,
    diamondShield: input.destroyedFront?.suit === 'diamonds' ? input.destroyedFront.value : 0,
    clubEligible:
      input.nextTargetIsCard && clubBoundaryEligible && input.attacker.card.suit === 'clubs',
    specVersion: input.modes.specVersion,
  });
  if (boundary.diamondApplied && input.frontStep) {
    input.frontStep.overflow = boundary.carryover;
    input.frontStep.remaining = boundary.carryover;
    input.frontStep.bonuses ??= [];
    if (boundary.clubBonusTarget === 'destroyedCard') {
      input.frontStep.bonuses.push('clubDoubleOverflow');
    }
    input.frontStep.bonuses.push('diamondDeathShield');
  }

  return {
    carryover: boundary.carryover,
    clubDoubled: boundary.clubBonusTarget === 'nextCard',
    diamondApplied: boundary.diamondApplied,
    lastDestroyed: input.destroyedFront,
    legacyHeartShield: input.destroyedFront?.suit === 'hearts' ? input.destroyedFront.value : 0,
  };
}

export function resolveReferenceCombat(input: ReferenceCombatInput): ReferenceCombatResult {
  const steps: CombatLogStep[] = [];
  const discarded: Card[] = [];
  let front = input.front;
  let back = input.back;
  let carryover = input.attacker.card.value;
  let destroyedFront: Card | null = null;
  let lastDestroyed: Card | null = null;
  let legacyFrontHeartShield = 0;

  if (front && carryover > 0) {
    const result = resolveReferenceCardTransition(
      front,
      carryover,
      input.attacker.card.type,
      true,
      input,
    );
    carryover = result.carryover;
    steps.push(result.step);
    if (result.destroyed) {
      destroyedFront = front.card;
      lastDestroyed = front.card;
      if (front.card.suit === 'hearts') legacyFrontHeartShield = front.card.value;
      discarded.push(front.card);
      front = null;
    } else {
      front = { ...front, currentHp: result.remainingHp };
    }
  }

  let clubDoubled = false;
  if (carryover > 0 && back) {
    const prefix = applyFrontToBackBoundary({
      carryover,
      attacker: input.attacker,
      destroyedFront,
      frontSlotWasEmpty: input.front === null,
      nextTargetIsCard: true,
      modes: input,
      frontStep: steps.at(-1),
    });
    carryover = prefix.carryover;
    clubDoubled = prefix.clubDoubled;
  } else if (carryover > 0 && input.specVersion === '1.0' && destroyedFront?.suit === 'diamonds') {
    // Historical v1.0 replay behavior applied the Diamond shield even when
    // the next target was the player. v2.0 follows the Card→Card rule scope.
    const prefix = applyFrontToBackBoundary({
      carryover,
      attacker: input.attacker,
      destroyedFront,
      frontSlotWasEmpty: input.front === null,
      nextTargetIsCard: false,
      modes: input,
      frontStep: steps.at(-1),
    });
    carryover = prefix.carryover;
  }

  let legacyBackHeartShield = 0;
  if (back && carryover > 0) {
    const result = resolveReferenceCardTransition(
      back,
      carryover,
      input.attacker.card.type,
      false,
      input,
    );
    carryover = result.carryover;
    if (clubDoubled) {
      result.step.bonuses ??= [];
      result.step.bonuses.push('clubDoubleOverflow');
    }
    steps.push(result.step);
    if (result.destroyed) {
      lastDestroyed = back.card;
      if (back.card.suit === 'hearts') legacyBackHeartShield = back.card.value;
      discarded.push(back.card);
      back = null;
    } else {
      back = { ...back, currentHp: result.remainingHp };
    }
  }

  let newLp = input.defenderLp;
  let totalLpDamage = 0;
  if (carryover > 0) {
    const incomingDamage = carryover;
    const heartShield =
      input.specVersion === '2.0'
        ? lastDestroyed?.suit === 'hearts'
          ? lastDestroyed.value
          : 0
        : legacyBackHeartShield || legacyFrontHeartShield;
    const boundary = resolveReferencePlayerBoundary({
      carryover,
      heartShield,
      spadeWeapon: input.attacker.card.suit === 'spades',
      specVersion: input.specVersion,
    });
    const lpDamage = boundary.damage;

    totalLpDamage = lpDamage;
    newLp = Math.max(0, input.defenderLp - lpDamage);
    steps.push({
      target: 'playerLp',
      incomingDamage,
      damage: lpDamage,
      absorbed:
        input.specVersion === '2.0'
          ? boundary.heartAbsorbed
          : Math.max(0, incomingDamage - lpDamage),
      overflow: 0,
      remaining: 0,
      lpBefore: input.defenderLp,
      lpAfter: newLp,
      bonuses: boundary.bonuses.length > 0 ? boundary.bonuses : undefined,
    });
  }

  const causeLabels = [...new Set(steps.flatMap((step) => step.bonuses ?? []))];
  const comboCount = steps.filter((step) => step.destroyed).length;
  return {
    front,
    back,
    newLp,
    discarded,
    combatEntry: {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard: input.attacker.card,
      targetColumn: 0,
      baseDamage: input.attacker.card.value,
      steps,
      totalLpDamage,
      causeLabels: causeLabels.length > 0 ? causeLabels : undefined,
      comboCount: comboCount > 1 ? comboCount : undefined,
    },
  };
}
