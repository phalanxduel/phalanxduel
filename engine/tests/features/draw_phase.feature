Feature: Draw phase - draw to maxHandSize, no reshuffle, empty deck does not lose
  Draw until hand.size == maxHandSize or deck empty.
  No reshuffle.
  Empty deck does not cause loss.

  Background:
    Given a valid match exists with deterministic seed "seed-draw-001"
    And maxHandSize is 4

  Scenario: Draws until reaching maxHandSize
    Given it is P1's DrawPhase
    And P1 hand size is 2
    And P1 deckCount is 10
    When DrawPhase runs for P1
    Then P1 draws 2 cards
    And P1 hand size is 4

  Scenario: Draws stop when deck is empty
    Given it is P1's DrawPhase
    And P1 hand size is 1
    And P1 deckCount is 2
    When DrawPhase runs for P1
    Then P1 draws 2 cards
    And P1 hand size is 3
    And P1 deckCount is 0

  Scenario: No reshuffle occurs from graveyard
    Given it is P1's DrawPhase
    And P1 hand size is 1
    And P1 deckCount is 0
    And P1 graveyardCount is 10
    When DrawPhase runs for P1
    Then P1 draws 0 cards
    And P1 deckCount remains 0

  Scenario: Empty deck does not automatically cause loss
    Given P1 deckCount is 0
    And P1 hand size is 3
    And P1 has at least 1 card deployed
    When P1 ends their turn
    Then the match is not forfeited due solely to empty deck
