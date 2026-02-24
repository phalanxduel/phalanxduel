Feature: Attack declaration validity and pass counting interaction
  A valid attack requires the active player has a card at rank 0 of the attacking column and a valid defending column index.
  If no attacker exists: outside SpecialStart counts as pass; inside SpecialStart does not.

  Background:
    Given a valid match exists with deterministic seed "seed-attack-declare-001"
    And classic deployment has completed
    And it is P1's turn

  Scenario: Reject attack when defending column index is invalid
    When P1 declares an attack from column 1 against defending column 5
    Then the action is rejected with error "invalid_defending_column"

  Scenario: Valid attack sets Origin Attacker as rank0 card of attacking column
    Given P1 column 2 rank 0 is "7♣"
    When P1 declares an attack from column 2 against defending column 2
    Then the Origin Attacker is "7♣"
    And the defending column is 2

  Scenario: Attack attempted with no attacker counts as pass outside SpecialStart
    Given SpecialStartMode is disabled
    And P1 column 3 rank 0 is empty
    When P1 declares an attack from column 3 against defending column 3
    Then a pass is recorded for P1
    And the action is recorded as "attack_attempt_no_attacker"

  Scenario: Attack attempted with no attacker does not count as pass inside SpecialStart window
    Given SpecialStartMode is enabled
    And the special start window is open
    And P1 has 0 cards deployed
    And P1 column 1 rank 0 is empty
    When P1 declares an attack from column 1 against defending column 1
    Then no pass is recorded for P1
    And the action is recorded as "attack_attempt_no_attacker"
