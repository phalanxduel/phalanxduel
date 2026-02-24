Feature: Pass rules - recording, consecutive and total limits, independent of "good attack availability"
  Pass is recorded when:
    - explicit pass action, OR
    - attack attempted but no valid attacker (outside SpecialStart)
  Forfeits:
    - maxConsecutivePasses => forfeit
    - maxTotalPassesPerPlayer => forfeit

  Background:
    Given a valid match exists with deterministic seed "seed-pass-001"
    And SpecialStartMode is disabled
    And modePassRules.maxConsecutivePasses is 3
    And modePassRules.maxTotalPassesPerPlayer is 5
    And classic deployment has completed

  Scenario: Explicit pass increments pass counters
    Given it is P1's turn
    When P1 takes the action "pass"
    Then P1 totalPasses increments by 1
    And P1 consecutivePasses increments by 1

  Scenario: Attack attempt with no valid attacker increments pass counters
    Given it is P1's turn
    And P1 column 1 rank 0 is empty
    When P1 declares an attack from column 1 against defending column 1
    Then P1 totalPasses increments by 1
    And P1 consecutivePasses increments by 1

  Scenario: Successful attack resets consecutive passes
    Given P1 consecutivePasses is 2
    And P1 column 1 rank 0 is "7♣"
    And defending column 1 rank 0 is "2♠"
    When P1 declares an attack from column 1 against defending column 1
    Then P1 consecutivePasses becomes 0

  Scenario: Forfeit on maxConsecutivePasses
    Given P1 consecutivePasses is 2
    And it is P1's turn
    When P1 takes the action "pass"
    Then P1 forfeits the match with reason "max_consecutive_passes"

  Scenario: Forfeit on maxTotalPassesPerPlayer
    Given P1 totalPasses is 4
    And it is P1's turn
    When P1 takes the action "pass"
    Then P1 forfeits the match with reason "max_total_passes"

  Scenario: Pass counting does not depend on whether an attack would be good
    Given it is P1's turn
    And P1 has at least one valid attacker somewhere
    And P1 chooses action "pass"
    Then a pass is recorded for P1
