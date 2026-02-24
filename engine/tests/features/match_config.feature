Feature: Match Configuration and Global Constraints
  The Phalanx System establishes strict physical limits and configuration rules to ensure 
  cross-platform determinism and gameplay viability.

  Scenario: Accept valid specVersion 1.0 with classic enabled and matching overlaps
    Given I build a match config with:
      | specVersion                    | 1.0   |
      | classic.enabled                | true  |
      | classic.mode                   | strict |
      | classic.battlefield.rows       | 2     |
      | classic.battlefield.columns    | 4     |
      | classic.hand.maxHandSize       | 4     |
      | classic.start.initialDraw      | 12    |
      | classic.modes.classicAces      | true  |
      | classic.modes.classicFaceCards | true  |
      | classic.modes.damagePersistence| classic |
      | rows                           | 2     |
      | columns                        | 4     |
      | maxHandSize                    | 4     |
      | initialDraw                    | 12    |
      | modeClassicAces                | true  |
      | modeClassicFaceCards           | true  |
      | modeDamagePersistence          | classic |
      | modeClassicDeployment          | true  |
      | modeSpecialStart.enabled       | false |
      | initiative.deployFirst         | P2    |
      | initiative.attackFirst         | P1    |
      | modePassRules.maxConsecutivePasses     | 3 |
      | modePassRules.maxTotalPassesPerPlayer  | 5 |
    And each player deckCount is 52
    When I create the match
    Then match creation succeeds

  Scenario: Reject when specVersion is not 1.0
    Given I build a match config with:
      | specVersion         | 1.1  |
      | classic.enabled     | true |
    And each player deckCount is 52
    When I create the match
    Then match creation is rejected with error "invalid_spec_version"

  Scenario: Initializing a match in Strict Classic Mode
    Given I build a match config with:
      | specVersion                 | 1.0  |
      | classic.enabled             | true |
      | classic.mode                | strict |
      | classic.hand.maxHandSize    | 4    |
      | maxHandSize                 | 5    |
    And each player deckCount is 52
    When I create the match
    Then match creation is rejected with error "STRICT_MODE_VIOLATION"

  Scenario: Hybrid Mode allows valid overrides
    Given I build a match config with:
      | specVersion                 | 1.0  |
      | classic.enabled             | true |
      | classic.mode                | hybrid |
      | classic.hand.maxHandSize    | 4    |
      | maxHandSize                 | 2    |
    When I create the match
    Then match creation MUST succeed
    And the effective maxHandSize is 2

  Scenario: When classic disabled, top-level governs even if classic block differs
    Given I build a match config with:
      | specVersion              | 1.0   |
      | classic.enabled          | false |
      | classic.hand.maxHandSize | 4     |
      | maxHandSize              | 5     |
    And each player deckCount is 52
    When I create the match
    Then match creation succeeds
    And the effective maxHandSize is 5

  Scenario: Global Constraint - Initial Draw Formula
    Given a battlefield of 3 rows and 4 columns
    When the engine calculates the initial draw
    Then it MUST be 16 cards ( (3*4) + 4 )

  Scenario: Global Constraint - Card Scarcity Invariant
    Given a deck of 52 cards
    And an initial draw configuration requiring 50 cards per player
    When the match is initialized
    Then creation MUST be rejected because it violates the "CARD_SCARCITY_INVARIANT"
    And at least 4 cards MUST remain in the deck after the first draw

  Scenario: Reject when any player starts with deckCount == 0
    Given I build a match config with:
      | specVersion        | 1.0  |
      | classic.enabled    | true |
    And P1 deckCount is 0
    And P2 deckCount is 52
    When I create the match
    Then match creation is rejected with error "invalid_deck_count"

  Scenario: Reject when required parameters are missing
    Given I build a match config with:
      | specVersion     | 1.0  |
      | classic.enabled | true |
    And I remove required parameter "columns"
    And each player deckCount is 52
    When I create the match
    Then match creation is rejected with error "missing_required_parameters"
