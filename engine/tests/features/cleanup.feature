Feature: Cleanup - destroy queue removal, graveyard LIFO, and column collapse
  After resolution:
    1) remove destroyed cards to graveyard (LIFO)
    2) collapse column (shift forward)

  Background:
    Given a valid match exists with deterministic seed "seed-cleanup-001"
    And modeDamagePersistence is "classic"
    And suit modifiers are disabled
    And it is P1's turn

  Scenario: Destroyed cards are moved to graveyard in LIFO order
    Given defender column 1 has ranks:
      | rank | card |
      | 0    | 2♦   |
      | 1    | 3♣   |
    When P1 attacks column 1 with attacker "10♠"
    Then the destroyQueue contains cards in destruction order:
      | card |
      | 2♦   |
      | 3♣   |
    When CleanupPhase runs
    Then defender graveyard top-to-bottom begins with:
      | card |
      | 3♣   |
      | 2♦   |

  Scenario: Column collapses by shifting remaining cards forward
    Given defender column 1 has ranks:
      | rank | card |
      | 0    | 2♦   |
      | 1    | 5♣   |
      | 2    | 9♥   |
    When P1 attacks column 1 with attacker "7♠"
    And "2♦" is destroyed
    When CleanupPhase runs
    Then defender column 1 rank 0 becomes "5♣"
    And defender column 1 rank 1 becomes "9♥"
