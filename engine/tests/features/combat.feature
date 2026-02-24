Feature: Attack Resolution Semantics
  The deterministic resolution algorithm processes a Target Chain front-to-back,
  evaluating suit boundary effects at each transition.

  Background:
    Given a valid match exists with deterministic seed "seed-combat-001"
    And modeDamagePersistence is "classic"
    And suit modifiers are enabled
    And it is P1's turn

  Scenario: Target chain includes all non-null ranks then player
    Given defending column 2 has ranks:
      | rank | card |
      | 0    | 2♦   |
      | 1    | null |
      | 2    | 5♥   |
    When P1 attacks from column 2 with attacker "7♣"
    Then the built target chain is:
      | target |
      | 2♦     |
      | 5♥     |
      | Player |

  Scenario: Origin attacker remains the same throughout resolution
    Given defending column 1 ranks are:
      | rank | card |
      | 0    | 2♠   |
      | 1    | 3♣   |
    When P1 attacks from column 1 with attacker "9♦"
    Then every resolution step reports Origin Attacker "9♦"

  Scenario: Every boundary emits a boundary_evaluated event
    Given defending column 1 ranks are:
      | rank | card |
      | 0    | 2♦   |
      | 1    | 3♥   |
    When P1 attacks from column 1 with attacker "9♣"
    Then the emitted events include boundary evaluations for:
      | boundaryType |
      | Card->Card   |
      | Card->Player |
    And each boundary_evaluated includes fields:
      | carryoverBefore |
      | shield          |
      | weapon          |
      | carryoverAfter  |

  Scenario: Boundary ordering is Shield then Weapon then Clamp
    Given defending column 1 ranks are:
      | rank | card |
      | 0    | 2♦   |
      | 1    | 3♥   |
    When P1 attacks from column 1 with attacker "9♣"
    Then within each boundary_evaluated event, shield is applied before weapon
    And clamp (if any) is applied after weapon

  Scenario: Diamond (♦) reduces carryover at the boundary to the next card
    Given defender column 1 has ranks:
      | rank | card |
      | 0    | 2♦   |
      | 1    | 4♠   |
    When P1 attacks column 1 with attacker "9♣"
    Then after destroying "2♦" the carryoverBefore at the Card->Card boundary is 7
    And diamond shield reduces carryoverAfter to 5

  Scenario: Club (♣) doubles carryover at first Card->Card boundary after first destruction
    Given defender column 1 has ranks:
      | rank | card |
      | 0    | 2♠   |
      | 1    | 3♦   |
    When P1 attacks column 1 with attacker "7♣"
    Then "2♠" is destroyed
    And at the first Card->Card boundary after the first destruction, weapon "club" is applied
    And carryoverAfter equals carryoverBefore multiplied by 2
    And clubApplied becomes true

  Scenario: Club does not apply if there is no destruction before a boundary
    Given defender column 1 has ranks:
      | rank | card |
      | 0    | 9♦   |
      | 1    | 2♠   |
    When P1 attacks column 1 with attacker "7♣"
    Then no card is destroyed
    And no boundary_evaluated event applies weapon "club"

  Scenario: Club applies at most once per attack even with multiple destructions
    Given defender column 1 has ranks:
      | rank | card |
      | 0    | 1♦   |
      | 1    | 1♥   |
      | 2    | 1♠   |
    When P1 attacks column 1 with attacker "9♣"
    Then weapon "club" is applied in at most 1 boundary_evaluated event

  Scenario: Heart (♥) reduces carryover to player if last destroyed before player is a heart
    Given defender column 1 has ranks:
      | rank | card |
      | 0    | 2♥   |
    When P1 attacks column 1 with attacker "5♦"
    And P2 life is 10
    Then "2♥" is destroyed
    And at the Card->Player boundary, shield "heart" is applied with value 2
    And P2 life is reduced by (carryoverBefore - 2) clamped at 0

  Scenario: Heart does not apply if the last destroyed card is not a heart
    Given defender column 1 has ranks:
      | rank | card |
      | 0    | 2♦   |
    When P1 attacks column 1 with attacker "5♦"
    Then "2♦" is destroyed
    And at the Card->Player boundary, no shield "heart" is applied

  Scenario: Hearts do not stack (only the final heart destroyed can apply)
    Given defender column 1 has ranks:
      | rank | card |
      | 0    | 1♥   |
      | 1    | 1♥   |
    When P1 attacks column 1 with attacker "5♦"
    Then at the Card->Player boundary, shield "heart" is applied at most once

  Scenario: Spade (♠) doubles damage that reaches the player
    Given defender column 1 has ranks:
      | rank | card |
      | 0    | 2♦   |
    When P1 attacks column 1 with attacker "7♠"
    And P2 life is 10
    Then at the Card->Player boundary, weapon "spade" is applied
    And P2 life is reduced by carryoverBefore multiplied by 2
