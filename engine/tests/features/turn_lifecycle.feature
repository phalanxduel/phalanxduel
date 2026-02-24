Feature: Turn lifecycle phases and guaranteed event emission
  Each turn executes all phases in order and each phase emits an event even if it changes nothing.

  Background:
    Given a valid match exists with specVersion "1.0" and deterministic seed "seed-turn-001"
    And classic deployment has completed
    And it is P1's turn

  Scenario: A full turn emits all phase events in canonical order
    When P1 takes the action "pass"
    Then the emitted events include, in order:
      | StartTurn           |
      | AttackPhase         |
      | AttackResolution    |
      | CleanupPhase        |
      | ReinforcementPhase  |
      | DrawPhase           |
      | EndTurn             |

  Scenario: AttackPhase and subsequent phases still emit when no attacker exists
    Given P1 has no card at rank 0 in column 1
    When P1 attempts an attack from column 1
    Then the emitted events include "AttackPhase"
    And the emitted events include "AttackResolution"
    And the emitted events include "CleanupPhase"
    And the emitted events include "ReinforcementPhase"
    And the emitted events include "DrawPhase"
