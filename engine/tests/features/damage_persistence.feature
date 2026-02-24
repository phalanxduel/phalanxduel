Feature: Damage persistence - classic vs cumulative
  Classic: no defense persists between turns.
  Cumulative: defense persists; non-destroyable face/ace clamps to 1.

  Background:
    Given a valid match exists with deterministic seed "seed-persist-001"
    And suit modifiers are disabled
    And it is P1's turn

  Scenario: Classic mode does not persist reduced defense across turns
    Given modeDamagePersistence is "classic"
    And defender column 1 has ranks:
      | rank | card |
      | 0    | 9♦   |
    When P1 attacks column 1 with attacker "5♣"
    Then the defender card is either destroyed or survives without persistent defense tracking
    When the next turn begins
    Then the defender card (if still present) has its original defense value

  Scenario: Cumulative mode persists reduced defense across turns when the card survives
    Given modeDamagePersistence is "cumulative"
    And defender column 1 has ranks:
      | rank | card |
      | 0    | 9♦   |
    When P1 attacks column 1 with attacker "5♣"
    Then the defender "9♦" survives
    And the defender's defense is reduced by 5 for subsequent turns
