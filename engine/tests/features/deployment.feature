Feature: Classic Deployment Mode
  Classic Deployment is an alternating, turn-based process that ensures both players 
  start with a filled grid and a regulated hand size.

  Background:
    Given a valid match exists with:
      | modeClassicDeployment   | true |
      | rows                    | 2    |
      | columns                 | 4    |
      | maxHandSize             | 4    |
      | initialDraw             | 12   |
      | initiative.deployFirst  | P2   |
    And the decks are deterministic with seed "seed-deploy-001"

  Scenario: Each player draws initialDraw at deployment start
    When the match enters ClassicDeploymentMode
    Then P1 hand size is 12
    And P2 hand size is 12

  Scenario: Players alternate deploying exactly one card at a time
    When the match enters ClassicDeploymentMode
    Then the next deployer is P2
    When P2 deploys 1 card to their board
    Then the next deployer is P1
    When P1 deploys 1 card to their board
    Then the next deployer is P2

  Scenario: Each player deploys until 8 are deployed and 4 remain in hand
    When the match enters ClassicDeploymentMode
    And ClassicDeploymentMode completes
    Then P1 has 8 cards deployed
    And P1 has 4 cards in hand
    And P2 has 8 cards deployed
    And P2 has 4 cards in hand

  Scenario: Deployment ends when P2 completes the final required deployment
    When the match enters ClassicDeploymentMode
    And the match reaches the state "P1 has 8 deployed and 4 in hand"
    And the match reaches the state "P2 has 7 deployed and 5 in hand"
    When P2 deploys 1 card to their board
    Then ClassicDeploymentMode is complete
    And the last deployment event is attributed to P2
    And the match transitions to the "StartTurn" phase of the first attacking player
