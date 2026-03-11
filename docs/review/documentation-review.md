Below is a Level-3 Documentation System Specification Prompt for Phalanx Duel.
This version turns documentation into something closer to a verifiable specification rather than descriptive prose.

The goal is that the documentation can be checked against the codebase, tests, and rules engine so that drift is detected early.

This prompt is designed to be used with AI agents in CI or automated audits.

⸻

Phalanx Duel — Documentation Verification Prompt (Level 3)

You are auditing the Phalanx Duel repository documentation.

Phalanx Duel is a deterministic tactical card game platform with the following properties:

• canonical rules specification
• deterministic match engine
• event-sourced match history
• replay verification
• server-authoritative gameplay
• configurable match formats

The documentation must function as a verifiable system specification.

This audit ensures that documentation:
	1.	accurately describes the rules
	2.	matches the implementation
	3.	explains system architecture
	4.	defines the event model
	5.	supports contributor understanding
	6.	avoids rule drift

Your audit must follow the phases below.

⸻

Phase 1 — Documentation System Inventory

Identify every documentation asset.

Search the repository for:

README.md
docs/
rules/
spec/
architecture/
design/
CONTRIBUTING.md

Also scan code directories for documentation:

src/
engine/
server/
client/
infra/
scripts/

Record:

• path
• document title
• category
• referenced system components
• referenced rules sections

Output:

{
  "documentation_inventory": [
    {
      "path": "",
      "category": "",
      "references_rules": [],
      "references_components": []
    }
  ]
}

⸻

Phase 2 — Canonical Rules Verification

Locate the canonical rules specification.

This document should define:

• match configuration
• deployment rules
• turn lifecycle
• attack resolution
• suit effects
• destruction rules
• reinforcement rules
• collapse behavior
• pass logic
• win conditions

Verify that:

• only one canonical rules source exists
• rules are deterministic
• rule definitions are precise

Detect rule duplication across:

• docs
• code comments
• tests

Output:

{
  "rules_specification_check": {
    "canonical_rules_document": "",
    "duplicate_rule_sources": [],
    "ambiguous_rules": [],
    "missing_rule_sections": [],
    "score": 1
  }
}

⸻

Phase 3 — Rule-to-Engine Traceability

Each rule section must map to implementation components.

Example mapping:

Rule Section	Engine Component
Deployment	deployment system
Attack resolution	combat resolution engine
Suit effects	suit modifier logic
Reinforcement	reinforcement handler
Column collapse	board state update

Detect whether documentation provides traceability between:

• rule sections
• engine modules

Output:

{
  "rule_engine_traceability": {
    "mapped_rules": [],
    "rules_without_engine_mapping": [],
    "engine_logic_without_rule_reference": [],
    "score": 1
  }
}

⸻

Phase 4 — Event Model Documentation Verification

Phalanx Duel uses an event-driven match system.

Documentation must describe:

• event generation
• event ordering
• event schema
• replay mechanics
• event determinism guarantees

Check whether documentation explains:

• how events represent game state changes
• how replay reconstructs matches

Output:

{
  "event_model_verification": {
    "event_docs": [],
    "missing_event_topics": [],
    "replay_explanation_quality": "",
    "score": 1
  }
}

⸻

Phase 5 — Architecture Documentation Verification

Evaluate documentation describing the system architecture.

Architecture documentation should explain:

• engine lifecycle
• match state transitions
• server authority
• client interaction model
• deterministic processing

Missing architecture documentation represents a major maintainability risk.

Output:

{
  "architecture_docs_check": {
    "architecture_documents": [],
    "missing_topics": [],
    "score": 1
  }
}

⸻

Phase 6 — Documentation Drift Detection

Detect inconsistencies between:

• documentation
• code
• tests

Examples:

Rule says:

face cards have value 11

Code implements:

face cards = 12

That is a documentation drift defect.

Report all mismatches discovered.

Output:

{
  "documentation_drift": {
    "rule_vs_code_mismatches": [],
    "rule_vs_test_mismatches": [],
    "terminology_drift": []
  }
}

⸻

Phase 7 — Terminology Verification

Extract domain terminology from documentation.

Important terms include:

• phalanx
• deployment
• reinforcement
• collapse
• attack
• suit effects
• column

Check that:

• terms are defined
• terms are used consistently
• synonyms are not used inconsistently

Output:

{
  "terminology_verification": {
    "terms_detected": [],
    "undefined_terms": [],
    "inconsistent_usage": [],
    "score": 1
  }
}

⸻

Phase 8 — Contributor Documentation

Evaluate documentation that supports developers.

Look for:

CONTRIBUTING.md
docs/dev/
docs/setup/

Verify that documentation explains:

• repository structure
• test execution
• development workflow
• rule modification process

Output:

{
  "developer_docs_check": {
    "developer_docs": [],
    "missing_topics": [],
    "score": 1
  }
}

⸻

Phase 9 — Gameplay Documentation

Evaluate player-facing documentation.

Gameplay documentation should explain:

• phalanx formation
• card ranks
• suit mechanics
• attack and defense rules
• match victory conditions

Output:

{
  "gameplay_docs_check": {
    "gameplay_documents": [],
    "missing_explanations": [],
    "score": 1
  }
}

⸻

Phase 10 — Documentation System Synthesis

Combine all findings into a final evaluation.

Output:

{
  "documentation_health": {
    "rules_specification": 1,
    "rule_engine_traceability": 1,
    "event_model": 1,
    "architecture_docs": 1,
    "terminology": 1,
    "developer_docs": 1,
    "gameplay_docs": 1
  },
  "documentation_strengths": [],
  "critical_gaps": [],
  "recommended_improvements": [],
  "documentation_maturity": ""
}

Possible maturity levels:

incomplete
early-stage
structured
verifiable-specification

⸻

Verification Standard

For Phalanx Duel, documentation should ultimately reach the level:

verifiable-specification

At that level documentation acts as:

• a reference for the rules
• a map of the system architecture
• a guide for contributors
• a specification that can be checked against implementation

This standard is particularly valuable for deterministic systems where correctness must be provable.

⸻

If you’d like, the next step I would strongly recommend is adding one final layer:

Executable Documentation

This means:

• rules scenarios expressed as tests
• diagrams generated from code
• documentation verified automatically in CI

That step would make Phalanx Duel’s documentation closer to something like the TCP RFCs or the Bitcoin protocol spec, which is exactly the level of rigor deterministic game engines benefit from.
