#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual, inspect } from 'node:util';
import type {
  Battlefield,
  BattlefieldCard,
  Card,
  CardType,
  GameState,
  PlayerState,
} from '../../shared/src/index.ts';
import { DEFAULT_MATCH_PARAMS } from '../../shared/src/index.ts';
import {
  referenceBattlefieldStates,
  referenceCards,
  referenceLpDomain,
  referenceModeDomain,
} from '../../engine/src/assurance/combat-proof-domain.ts';
import {
  resolveReferenceCardBoundary,
  resolveReferenceCardTransition,
  resolveReferenceCombat,
  resolveReferencePlayerBoundary,
} from '../../engine/src/assurance/combat-reference.ts';
import type {
  ReferenceCombatInput,
  ReferenceCombatModes,
  ReferenceCombatResult,
} from '../../engine/src/assurance/combat-reference.ts';
import { resolveAttack } from '../../engine/src/combat.ts';
import {
  resolveCardBoundary,
  resolveCardTransition,
  resolvePlayerBoundary,
} from '../../engine/src/combat-math.ts';
import { createDeck } from '../../engine/src/deck.ts';

interface ProductionResult extends ReferenceCombatResult {}

interface ProofCounts {
  cardTransitions: number;
  cardBoundaries: number;
  playerBoundaries: number;
  emptyChain: number;
  frontOnly: number;
  backOnly: number;
  twoRankBasis: number;
  total: number;
}

const MATCH_ID = '00000000-0000-4000-8000-000000000343';
const PLAYER_IDS = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
] as const;
const FULL_LP = 500;

function assertIndependentReferenceModel(): void {
  for (const relativePath of [
    '../../engine/src/assurance/combat-reference.ts',
    '../../engine/src/assurance/combat-proof-domain.ts',
  ]) {
    const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
    const forbidden = [
      /@phalanxduel\/engine/,
      /from ['"].*\/combat(?:\.js|\.ts)?['"]/,
      /\bresolveAttack\b/,
      /\bcreateDeck\b/,
    ];
    for (const pattern of forbidden) {
      if (pattern.test(source)) {
        throw new Error(`Reference independence violation in ${relativePath}: ${pattern.source}`);
      }
    }
  }
}

function cardKey(card: Omit<Card, 'id'>): string {
  return `${card.face}|${card.value}|${card.type}|${card.suit}`;
}

function assertCanonicalDeckAgreement(): void {
  const expected = referenceCards().map(cardKey).sort();
  const actual = createDeck().map(cardKey).sort();
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(
      `Canonical card domain differs from createDeck()\nexpected=${inspect(expected)}\nactual=${inspect(actual)}`,
    );
  }
}

function player(id: string, battlefield: Battlefield, lifepoints: number): PlayerState {
  return {
    player: { id, name: id === PLAYER_IDS[0] ? 'Proof P1' : 'Proof P2' },
    hand: [],
    battlefield,
    drawpile: [],
    discardPile: [],
    lifepoints,
    deckSeed: 0,
  };
}

function productionResult(input: ReferenceCombatInput): ProductionResult {
  const attackerBattlefield = Array<BattlefieldCard | null>(8).fill(null);
  attackerBattlefield[0] = input.attacker;
  const defenderBattlefield = Array<BattlefieldCard | null>(8).fill(null);
  defenderBattlefield[0] = input.front;
  defenderBattlefield[4] = input.back;
  const state: GameState = {
    matchId: MATCH_ID,
    specVersion: input.specVersion,
    params: {
      ...DEFAULT_MATCH_PARAMS,
      specVersion: input.specVersion,
      modeClassicAces: input.modeClassicAces,
      modeClassicFaceCards: input.modeClassicFaceCards,
      modeDamagePersistence: input.modeDamagePersistence,
    },
    players: [
      player(PLAYER_IDS[0], attackerBattlefield, FULL_LP),
      player(PLAYER_IDS[1], defenderBattlefield, input.defenderLp),
    ],
    activePlayerIndex: 0,
    phase: 'AttackPhase',
    turnNumber: 1,
    gameOptions: {
      damageMode: input.modeDamagePersistence,
      startingLifepoints: FULL_LP,
    },
  };
  const result = resolveAttack(state, 0, 0, 0);
  return {
    front: result.state.players[1]!.battlefield[0] ?? null,
    back: result.state.players[1]!.battlefield[4] ?? null,
    newLp: result.state.players[1]!.lifepoints,
    discarded: result.state.players[1]!.discardPile,
    combatEntry: result.combatEntry,
  };
}

function applicableRuleIds(input: ReferenceCombatInput): string[] {
  const ids = ['PD-RULE-017', 'PD-RULE-018', 'PD-RULE-019', 'PD-RULE-020', 'PD-RULE-022'];
  const targets = [input.front, input.back].filter(
    (card): card is BattlefieldCard => card !== null,
  );
  if (targets.some((target) => target.card.suit === 'diamonds')) ids.push('PD-RULE-023');
  if (input.attacker.card.suit === 'clubs') ids.push('PD-RULE-024', 'PD-RULE-025');
  if (targets.some((target) => target.card.suit === 'hearts'))
    ids.push('PD-RULE-026', 'PD-RULE-027');
  if (input.attacker.card.suit === 'spades') ids.push('PD-RULE-028');
  if (targets.some((target) => target.card.type === 'ace')) ids.push('PD-RULE-029', 'PD-RULE-030');
  if (targets.some((target) => ['jack', 'queen', 'king'].includes(target.card.type))) {
    ids.push('PD-RULE-021', 'PD-RULE-031', 'PD-RULE-032');
  }
  return ids;
}

function reproducibleInput(input: ReferenceCombatInput, topology: string): object {
  const cell = (value: BattlefieldCard | null) =>
    value
      ? {
          face: value.card.face,
          suit: value.card.suit,
          type: value.card.type,
          value: value.card.value,
          currentHp: value.currentHp,
        }
      : null;
  return {
    topology,
    specVersion: input.specVersion,
    modeClassicAces: input.modeClassicAces,
    modeClassicFaceCards: input.modeClassicFaceCards,
    modeDamagePersistence: input.modeDamagePersistence,
    attacker: cell(input.attacker),
    front: cell(input.front),
    back: cell(input.back),
    defenderLp: input.defenderLp,
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function verifyStage(
  stage: string,
  ruleIds: string[],
  counterexample: unknown,
  actual: unknown,
  expected: unknown,
  digest: ReturnType<typeof createHash>,
): void {
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(
      [
        `Combat reference mismatch in ${stage}.`,
        `ruleIds=${ruleIds.join(',')}`,
        `counterexample=${JSON.stringify(counterexample)}`,
        `expected=${inspect(expected, { depth: 8, sorted: true })}`,
        `actual=${inspect(actual, { depth: 8, sorted: true })}`,
      ].join('\n'),
    );
  }
  digest.update(canonicalJson([stage, counterexample, expected]));
}

function verifyOne(
  input: ReferenceCombatInput,
  topology: string,
  digest: ReturnType<typeof createHash>,
): void {
  const expected = resolveReferenceCombat(input);
  const actual = productionResult(input);
  if (!isDeepStrictEqual(actual, expected)) {
    const counterexample = reproducibleInput(input, topology);
    throw new Error(
      [
        'Combat reference mismatch.',
        `ruleIds=${applicableRuleIds(input).join(',')}`,
        `counterexample=${JSON.stringify(counterexample)}`,
        `expected=${inspect(expected, { depth: 8, sorted: true })}`,
        `actual=${inspect(actual, { depth: 8, sorted: true })}`,
      ].join('\n'),
    );
  }
  digest.update(canonicalJson([reproducibleInput(input, topology), expected]));
}

function inputFor(
  modes: ReferenceCombatModes,
  attackerCard: Card,
  front: BattlefieldCard | null,
  back: BattlefieldCard | null,
  defenderLp: number,
): ReferenceCombatInput {
  return {
    ...modes,
    attacker: {
      card: attackerCard,
      position: { row: 0, col: 0 },
      currentHp: attackerCard.value,
      faceDown: false,
    },
    front,
    back,
    defenderLp,
  };
}

function verifyDomain(): { counts: ProofCounts; digest: string } {
  const modes = referenceModeDomain();
  const attackers = referenceCards();
  const frontStates = referenceBattlefieldStates(0);
  const backStates = referenceBattlefieldStates(1);
  const digest = createHash('sha256');
  const counts: ProofCounts = {
    cardTransitions: 0,
    cardBoundaries: 0,
    playerBoundaries: 0,
    emptyChain: 0,
    frontOnly: 0,
    backOnly: 0,
    twoRankBasis: 0,
    total: 0,
  };

  const attackerTypes: CardType[] = ['ace', 'number', 'jack', 'queen', 'king'];
  const transitionModes = modes.filter((value) => value.specVersion === '2.0');
  for (const mode of transitionModes) {
    for (const attackerType of attackerTypes) {
      for (const isFrontRank of [true, false]) {
        const targets = isFrontRank ? frontStates : backStates;
        for (const target of targets) {
          for (let incomingDamage = 0; incomingDamage <= 22; incomingDamage += 1) {
            const counterexample = {
              attackerType,
              isFrontRank,
              modeClassicAces: mode.modeClassicAces,
              modeClassicFaceCards: mode.modeClassicFaceCards,
              modeDamagePersistence: mode.modeDamagePersistence,
              target: {
                face: target.card.face,
                suit: target.card.suit,
                type: target.card.type,
                value: target.card.value,
                currentHp: target.currentHp,
              },
              incomingDamage,
            };
            const context = {
              attackerType,
              modeClassicAces: mode.modeClassicAces,
              modeClassicFaceCards: mode.modeClassicFaceCards,
              modeDamagePersistence: mode.modeDamagePersistence,
            };
            verifyStage(
              'card-transition',
              ['PD-RULE-019', 'PD-RULE-020', 'PD-RULE-021', 'PD-RULE-029', 'PD-RULE-032'],
              counterexample,
              resolveCardTransition(target, incomingDamage, isFrontRank, context),
              resolveReferenceCardTransition(
                target,
                incomingDamage,
                attackerType,
                isFrontRank,
                mode,
              ),
              digest,
            );
            counts.cardTransitions += 1;
          }
        }
      }
    }
  }

  for (const specVersion of ['2.0', '1.0'] as const) {
    for (let carryover = 0; carryover <= 20; carryover += 1) {
      for (let diamondShield = 0; diamondShield <= 11; diamondShield += 1) {
        for (const clubEligible of [false, true]) {
          const input = { carryover, diamondShield, clubEligible, specVersion };
          verifyStage(
            'card-boundary',
            ['PD-RULE-022', 'PD-RULE-023', 'PD-RULE-024', 'PD-RULE-025'],
            input,
            resolveCardBoundary(input),
            resolveReferenceCardBoundary(input),
            digest,
          );
          counts.cardBoundaries += 1;
        }
      }
    }

    for (let carryover = 0; carryover <= 40; carryover += 1) {
      for (let heartShield = 0; heartShield <= 11; heartShield += 1) {
        for (const spadeWeapon of [false, true]) {
          const input = { carryover, heartShield, spadeWeapon, specVersion };
          verifyStage(
            'player-boundary',
            ['PD-RULE-022', 'PD-RULE-026', 'PD-RULE-027', 'PD-RULE-028'],
            input,
            resolvePlayerBoundary(input),
            resolveReferencePlayerBoundary(input),
            digest,
          );
          counts.playerBoundaries += 1;
        }
      }
    }
  }

  const emptyModes: ReferenceCombatModes[] = (['2.0', '1.0'] as const).map((specVersion) => ({
    specVersion,
    modeClassicAces: false,
    modeClassicFaceCards: false,
    modeDamagePersistence: 'classic',
  }));
  for (const modesValue of emptyModes) {
    for (const attacker of attackers) {
      for (const defenderLp of referenceLpDomain()) {
        verifyOne(inputFor(modesValue, attacker, null, null, defenderLp), 'empty', digest);
        counts.emptyChain += 1;
      }
    }
  }

  for (const modesValue of modes) {
    for (const attacker of attackers) {
      for (const front of frontStates) {
        verifyOne(inputFor(modesValue, attacker, front, null, FULL_LP), 'front-only', digest);
        counts.frontOnly += 1;
      }
      for (const back of backStates) {
        verifyOne(inputFor(modesValue, attacker, null, back, FULL_LP), 'back-only', digest);
        counts.backOnly += 1;
      }
    }
  }

  const basisFaces = new Set(['A', '2', 'J', 'Q', 'K']);
  const basisAttackerFaces = new Set(['A', '2', 'T', 'J', 'Q', 'K']);
  const frontBasis = frontStates.filter(
    (state) =>
      basisFaces.has(state.card.face) &&
      (state.currentHp === 1 || state.currentHp === state.card.value),
  );
  const backBasis = backStates.filter(
    (state) =>
      basisFaces.has(state.card.face) &&
      (state.currentHp === 1 || state.currentHp === state.card.value),
  );
  const attackerBasis = attackers.filter((card) => basisAttackerFaces.has(card.face));
  for (const modesValue of modes) {
    for (const attacker of attackerBasis) {
      for (const front of frontBasis) {
        for (const back of backBasis) {
          verifyOne(
            inputFor(modesValue, attacker, front, back, FULL_LP),
            'front-and-back-basis',
            digest,
          );
          counts.twoRankBasis += 1;
        }
      }
    }
  }

  counts.total = Object.entries(counts)
    .filter(([key]) => key !== 'total')
    .reduce((sum, [, value]) => sum + value, 0);
  return { counts, digest: digest.digest('hex') };
}

assertIndependentReferenceModel();
assertCanonicalDeckAgreement();
const result = verifyDomain();
const recordedProof = JSON.parse(
  readFileSync(new URL('../../docs/quality/combat-reference-proof.json', import.meta.url), 'utf8'),
) as { proofVersion: number; counts: ProofCounts; digest: string };
if (
  recordedProof.proofVersion !== 1 ||
  !isDeepStrictEqual(recordedProof.counts, result.counts) ||
  recordedProof.digest !== result.digest
) {
  throw new Error(
    [
      'Combat proof artifact drifted.',
      'Update docs/quality/combat-reference-proof.json only after reviewing the finite domain change.',
      `recorded=${inspect(recordedProof, { sorted: true })}`,
      `computed=${inspect(result, { sorted: true })}`,
    ].join('\n'),
  );
}
console.log('Combat reference verification passed.');
console.log(JSON.stringify(result, null, 2));
