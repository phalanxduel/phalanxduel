Feature: Hard invariants (no randomness, club at most once, hearts do not stack, no reshuffle, no silent classic drift)
  These invariants must hold for all matches under spec v1.0.

  Background:
    Given a valid match exists with deterministic seed "seed-invariants-001"
    And classic.enabled is true
    And suit modifiers are enabled

  Scenario: No randomness in resolution (same state and action always same outcome)
    Given I snapshot the full preState as "S0"
    When P1 attacks column 1 with attacker "7♣"
    Then I snapshot the full postState as "S1"
    When I restore preState "S0" and run the same action again
    Then the resulting postState equals "S1"
    And the emitted events are identical

  Scenario: Club applies at most once
    Given defender column 1 has ranks:
      | rank | card |
      | 0    | 1♦   |
      | 1    | 1♥   |
      | 2    | 1♠   |
    When P1 attacks column 1 with attacker "9♣"
    Then the event log contains at most 1 boundary_evaluated event with weapon.type "club"

  Scenario: Hearts do not stack
    Given defender column 1 has ranks:
      | rank | card |
      | 0    | 1♥   |
      | 1    | 2♥   |
    When P1 attacks column 1 with attacker "10♦"
    Then the event log contains at most 1 boundary_evaluated event with shield.type "heart"

  Scenario: No reshuffle from graveyard
    Given P1 deckCount is 0
    And P1 graveyardCount is 20
    When P1 enters DrawPhase with hand size 0
    Then P1 draws 0 cards
    And P1 deckCount remains 0

  Scenario: No silent parameter drift when classic enabled
    Given classic.enabled is true
    When the match begins
    Then the effective rows equals classic.battlefield.rows
    And the effective columns equals classic.battlefield.columns
    And the effective maxHandSize equals classic.hand.maxHandSize
    And the effective initialDraw equals classic.start.initialDraw
