Feature: Reinforcement phase - deploy from hand to back ranks after cleanup
  After cleanup, player may deploy cards from hand to back ranks, limited by empty ranks and hand size.

  Background:
    Given a valid match exists with deterministic seed "seed-reinforce-001"
    And classic deployment has completed
    And it is P2's turn

  Scenario: Player may deploy to back ranks up to available empty ranks
    Given P2 column 3 has empty ranks at the back:
      | emptyRank |
      | 1         |
    And P2 hand contains:
      | card |
      | 4♦   |
      | 8♣   |
    When P2 reinforces column 3 by deploying "4♦" to the back
    Then P2 column 3 rank 1 is "4♦"
    And P2 hand no longer contains "4♦"

  Scenario: Player cannot deploy more cards than empty ranks
    Given P2 column 2 has no empty ranks
    And P2 hand contains:
      | card |
      | 4♦   |
    When P2 reinforces column 2 by deploying "4♦"
    Then the action is rejected with error "no_empty_ranks"

  Scenario: ReinforcementPhase emits even when player deploys nothing
    When P2 chooses no reinforcement
    Then an event "ReinforcementPhase" is emitted
