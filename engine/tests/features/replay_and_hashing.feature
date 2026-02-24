Feature: Deterministic replay and hashing per turn
  With identical specVersion, params, preState, and turnInput, the system must produce identical events, postState, and hashes.
  turnHash = sha256(specVersion + params + preStateHash + turnInput + eventLogHash + postStateHash)

  Background:
    Given a valid match exists with specVersion "1.0" and deterministic seed "seed-hash-001"
    And classic deployment has completed

  Scenario: Identical inputs yield identical events, postState, and hashes
    Given I capture preStateHash as "H_pre"
    When P1 takes the action "pass"
    Then I capture eventLogHash as "H_log"
    And I capture postStateHash as "H_post"
    And I capture turnHash as "H_turn"
    When I replay the same turn with the same specVersion, params, preState, and turnInput
    Then the replayed event sequence is identical
    And the replayed postState is identical
    And the replayed preStateHash equals "H_pre"
    And the replayed eventLogHash equals "H_log"
    And the replayed postStateHash equals "H_post"
    And the replayed turnHash equals "H_turn"

  Scenario: Different turnInput changes at least one of events, postState, or hashes
    Given I capture preStateHash as "H_pre"
    When P1 takes the action "pass"
    Then I capture turnHash as "H_turn_pass"
    When I replay from the same preState but with turnInput "attack column 1 -> 1"
    Then the produced turnHash is not "H_turn_pass"
