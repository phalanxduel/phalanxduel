---------------------------- MODULE PhalanxDuelV3 ----------------------------
(*
 * Formal TLA+ specification of Phalanx Duel Classic v3.0 core invariants:
 *   1. Non-commutative Shield-Before-Weapon Suit Boundary Algebra (combat-math.ts)
 *   2. Guaranteed Finite Termination / Liveness Policy (liveness.ts)
 *   3. Fog-of-War Projection Non-Interference (observer redaction boundary)
 *
 * Verified alongside the live TypeScript engine by:
 *   pnpm verify:formal  (scripts/ci/verify-formal-properties.ts)
 *)
EXTENDS Integers, Sequences, FiniteSets

CONSTANTS
  MaxDamage,        \* Bounded damage domain for finite model checking (e.g. 12)
  MaxShield,        \* Bounded shield domain (e.g. 11)
  HardTurnLimit,    \* Classic v3.0: 200
  NoProgressLimit,  \* Classic v3.0: 50
  RepetitionLimit   \* Classic v3.0: 3

VARIABLES
  phase,            \* Current FSM phase
  turnNumber,       \* Completed turn counter
  noProgressTurns,  \* Consecutive turns without irreversible progress
  maxRepetition,    \* Max count of any semantic position signature sigma(s)
  lp0, lp1,         \* Player life points
  p0Hand, p1Hand,   \* Hidden hands (distinct per player)
  p0Board, p1Board  \* Public 4x2 battlefields

vars == <<phase, turnNumber, noProgressTurns, maxRepetition, lp0, lp1, p0Hand, p1Hand, p0Board, p1Board>>

Phases == {
  "StartTurn", "DeploymentPhase", "AttackPhase", "AttackResolution",
  "CleanupPhase", "ReinforcementPhase", "DrawPhase", "EndTurn", "gameOver"
}

Max(a, b) == IF a >= b THEN a ELSE b
Min(a, b) == IF a <= b THEN a ELSE b

(* -------------------------------------------------------------------------
 * 1. Suit Boundary Algebra (engine/src/combat-math.ts)
 * ------------------------------------------------------------------------- *)

Shield(c, d) == Max(0, c - d)
Weapon(c)    == 2 * c

\* v3.0: Shield resolves BEFORE Weapon (W o S_d)
CardBoundaryV3(c, diamondShield, clubEligible) ==
  LET afterDiamond == Shield(c, diamondShield)
  IN IF clubEligible /\ afterDiamond > 0 THEN Weapon(afterDiamond) ELSE afterDiamond

\* Legacy v1.0: Weapon resolved BEFORE Shield (S_d o W)
CardBoundaryV1(c, diamondShield, clubEligible) ==
  LET afterClub == IF clubEligible /\ c > 0 THEN Weapon(c) ELSE c
  IN Shield(afterClub, diamondShield)

\* v3.0 Player Boundary: Heart Shield BEFORE Spade Weapon
PlayerBoundaryV3(c, heartShield, spadeWeapon) ==
  LET afterHeart == Shield(c, heartShield)
  IN IF spadeWeapon /\ afterHeart > 0 THEN Weapon(afterHeart) ELSE afterHeart

(* Theorem 1a: If shield >= carryover, weapon doubling never fires (output = 0). *)
ShieldZeroesWeaponInvariant ==
  \A c \in 0..MaxDamage :
    \A d \in 0..MaxShield :
      (d >= c) => (CardBoundaryV3(c, d, TRUE) = 0 /\ PlayerBoundaryV3(c, d, TRUE) = 0)

(* Theorem 1b: v3.0 Shield-before-Weapon strictly dominates or equals v1.0 in defense. *)
V3StrictlyLimitsBurstInvariant ==
  \A c \in 1..MaxDamage :
    \A d \in 1..MaxShield :
      CardBoundaryV3(c, d, TRUE) <= CardBoundaryV1(c, d, TRUE)

(* Theorem 1c: Exact non-commutativity gap when weapon active and 0 < d < 2c. *)
NonCommutativityGapInvariant ==
  \A c \in 1..MaxDamage :
    \A d \in 1..MaxShield :
      (d < 2 * c) => (CardBoundaryV1(c, d, TRUE) - CardBoundaryV3(c, d, TRUE) = Min(d, 2 * c - d))

(* -------------------------------------------------------------------------
 * 2. Fog-of-War Projection Functor pi_o(s) (Non-Interference)
 * ------------------------------------------------------------------------- *)

ProjectForPlayer(p, h0, h1, b0, b1, l0, l1) ==
  IF p = 0
    THEN <<h0, b0, b1, l0, l1>>
    ELSE <<h1, b0, b1, l0, l1>>

(* Theorem 2: Changing opponent's hidden hand never alters player's projection. *)
FogOfWarNonInterference ==
  \A h0, h1a, h1b \in {0, 1} :
    ProjectForPlayer(0, h0, h1a, p0Board, p1Board, lp0, lp1) =
    ProjectForPlayer(0, h0, h1b, p0Board, p1Board, lp0, lp1)

(* -------------------------------------------------------------------------
 * 3. Liveness & Guaranteed Finite Termination (engine/src/liveness.ts)
 * ------------------------------------------------------------------------- *)

Init ==
  /\ phase = "StartTurn"
  /\ turnNumber = 0
  /\ noProgressTurns = 0
  /\ maxRepetition = 1
  /\ lp0 = 20
  /\ lp1 = 20
  /\ p0Hand = 0
  /\ p1Hand = 0
  /\ p0Board = 0
  /\ p1Board = 0

DrawTriggered ==
  \/ maxRepetition >= RepetitionLimit
  \/ noProgressTurns >= NoProgressLimit
  \/ turnNumber >= HardTurnLimit

Step ==
  \/ /\ phase = "StartTurn"
     /\ phase' = "DeploymentPhase"
     /\ UNCHANGED <<turnNumber, noProgressTurns, maxRepetition, lp0, lp1, p0Hand, p1Hand, p0Board, p1Board>>
  \/ /\ phase = "DeploymentPhase"
     /\ phase' = "AttackPhase"
     /\ UNCHANGED <<turnNumber, noProgressTurns, maxRepetition, lp0, lp1, p0Hand, p1Hand, p0Board, p1Board>>
  \/ /\ phase = "AttackPhase"
     /\ IF DrawTriggered \/ lp0 = 0 \/ lp1 = 0
        THEN /\ phase' = "gameOver"
             /\ UNCHANGED <<turnNumber, noProgressTurns, maxRepetition, lp0, lp1, p0Hand, p1Hand, p0Board, p1Board>>
        ELSE /\ phase' = "AttackResolution"
             /\ UNCHANGED <<turnNumber, noProgressTurns, maxRepetition, lp0, lp1, p0Hand, p1Hand, p0Board, p1Board>>
  \/ /\ phase = "AttackResolution"
     /\ phase' = "EndTurn"
     /\ turnNumber' = turnNumber + 1
     /\ noProgressTurns' = noProgressTurns + 1
     /\ UNCHANGED <<maxRepetition, lp0, lp1, p0Hand, p1Hand, p0Board, p1Board>>
  \/ /\ phase = "EndTurn"
     /\ phase' = "AttackPhase"
     /\ UNCHANGED <<turnNumber, noProgressTurns, maxRepetition, lp0, lp1, p0Hand, p1Hand, p0Board, p1Board>>
  \/ /\ phase = "gameOver"
     /\ UNCHANGED vars

Spec == Init /\ [][Step]_vars /\ WF_vars(Step)

TypeInvariant ==
  /\ phase \in Phases
  /\ turnNumber \in 0..HardTurnLimit
  /\ noProgressTurns \in 0..NoProgressLimit
  /\ lp0 >= 0 /\ lp1 >= 0

(* Theorem 3: Every v3.0 match is bounded by HardTurnLimit (200 turns). *)
BoundedTerminationInvariant ==
  turnNumber <= HardTurnLimit

EventuallyGameOver == <>(phase = "gameOver")
=============================================================================
