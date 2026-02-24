Feature: Special Start Mode window closure
  During initial zero-deployment condition, inability to attack due to no deployed cards does NOT count as pass.
  After both players complete first forced reinforcement, event special_start_window_closed is emitted.
  After closure, normal pass rules apply.

  Background:
    Given a valid match exists with:
      | modeSpecialStart.enabled | true |
      | modeSpecialStart.noAttackCountsAsPassUntil | bothPlayersCompletedFirstForcedReinforcement |
    And the special start window is open
    And P1 has 0 cards deployed
    And P2 has 0 cards deployed

  Scenario: Window remains open until both players complete first forced reinforcement
    When P1 completes first forced reinforcement
    Then the special start window is open
    And no event "special_start_window_closed" has been emitted
    When P2 completes first forced reinforcement
    Then the special start window is closed
    And an event "special_start_window_closed" is emitted

  Scenario: After closure, no-attacker attack attempts count as pass
    Given the special start window is closed
    And it is P1's turn
    And P1 column 1 rank 0 is empty
    When P1 declares an attack from column 1 against defending column 1
    Then a pass is recorded for P1
