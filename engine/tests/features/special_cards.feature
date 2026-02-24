Feature: Special Card Eligibility
  Aces and Face Cards have specific destruction rules that govern their survivability
  in the Phalanx System.

  Background:
    Given a valid match exists with deterministic seed "seed-special-001"
    And suit modifiers are enabled
    And it is P1's turn

  Scenario: Non-ace attacker cannot destroy ace at targetIndex 0
    Given modeClassicAces is true
    And defender column 1 has ranks:
      | rank | card |
      | 0    | A♣   |
    When P1 attacks column 1 with attacker "5♦"
    Then "A♣" is not queued for destruction
    And remaining becomes 0 after the ace is deemed not eligible

  Scenario: Ace attacker can destroy ace at targetIndex 0
    Given modeClassicAces is true
    And defender column 1 has ranks:
      | rank | card |
      | 0    | A♣   |
    When P1 attacks column 1 with attacker "A♠"
    Then "A♣" is queued for destruction
    And CleanupPhase removes "A♣" to the graveyard

  Scenario: Ace in deeper targetIndex is not destroyable even by ace attacker
    Given modeClassicAces is true
    And defender column 1 has ranks:
      | rank | card |
      | 0    | 2♦   |
      | 1    | A♣   |
    When P1 attacks column 1 with attacker "A♠"
    Then "2♦" may be destroyed if eligible by normal rules
    And "A♣" at targetIndex 1 is not queued for destruction
    And remaining becomes 0 when the ace is deemed not eligible

  Scenario: Jack cannot destroy Queen
    Given modeClassicFaceCards is true
    And modeDamagePersistence is "classic"
    And defender column 1 has ranks:
      | rank | card |
      | 0    | Q♣   |
    When P1 attacks column 1 with attacker "J♠"
    Then "Q♣" is not queued for destruction
    And remaining becomes 0

  Scenario: Queen can destroy Jack
    Given modeClassicFaceCards is true
    And modeDamagePersistence is "classic"
    And defender column 1 has ranks:
      | rank | card |
      | 0    | J♦   |
    When P1 attacks column 1 with attacker "Q♠"
    Then "J♦" is queued for destruction

  Scenario: Queen can destroy Queen
    Given modeClassicFaceCards is true
    And modeDamagePersistence is "classic"
    And defender column 1 has ranks:
      | rank | card |
      | 0    | Q♦   |
    When P1 attacks column 1 with attacker "Q♣"
    Then "Q♦" is queued for destruction

  Scenario: King can destroy King
    Given modeClassicFaceCards is true
    And modeDamagePersistence is "classic"
    And defender column 1 has ranks:
      | rank | card |
      | 0    | K♥   |
    When P1 attacks column 1 with attacker "K♠"
    Then "K♥" is queued for destruction

  Scenario: In cumulative mode, non-eligible face clamp to 1 and halts carryover
    Given modeClassicFaceCards is true
    And modeDamagePersistence is "cumulative"
    And defender column 1 has ranks:
      | rank | card |
      | 0    | Q♣   |
    When P1 attacks column 1 with attacker "J♠"
    Then the defender "Q♣" defense is clamped to 1
    And remaining becomes 0
