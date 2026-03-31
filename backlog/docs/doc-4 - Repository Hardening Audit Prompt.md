---
id: doc-4
title: Repository Hardening Audit Prompt
type: other
created_date: '2026-03-31 20:35'
updated_date: '2026-03-31 21:39'
---

# Repository Hardening Audit Prompt

This is the canonical active prompt for repository hardening and documentation
consolidation audits. Generated outputs belong under `archive/ai-reports/`,
not under `docs/` or `backlog/docs/`.

## Prompt

Use the existing hardening prompt text from the prior `docs/review/` surface as
the active review source. This Backlog record is now the canonical home for
that prompt and for future maintenance.

The prompt requires:

- evidence-based repository hardening and documentation-consolidation review
- explicit multi-agent coordination and output-isolation rules
- archive-only placement for generated report artifacts
- strict canonical-source and stale-artifact evaluation
- classification of documentation, tooling, and historical materials by role

For detailed execution, continue reading the copied prompt body below.

## Core Objectives

Perform a full repository review oriented around hardening, consolidation, and
signal-to-noise improvement.

Specifically:

- identify documentation that is duplicated, stale, speculative,
  contradictory, misplaced, or unnecessarily verbose
- identify files and directories that appear to be remnants of prior
  experiments, abandoned plans, generated artifacts, or transitional work
- identify missing documentation that is actually necessary for operating,
  developing, testing, or reasoning about the app
- identify important artifacts from earlier work that still matter and should
  be preserved, linked, relocated, or rewritten rather than deleted
- identify context files that AI agents are likely to over-read, misread, or
  be distracted by
- identify places where the repo explains the same thing in multiple documents
  with drift between them
- identify places where the code is the truth but docs have not caught up
- identify places where docs claim intent, architecture, workflow, or rules
  that are not reflected in reality
- identify mystery files whose purpose is unclear and must be explained, moved,
  or removed

## Usage Notes

- Generated outputs belong under `archive/ai-reports/`.
- Active prompt maintenance now belongs in `backlog/docs/`.
- The former `docs/review/HARDENING.md` shim has been archived to
  `archive/docs/2026-03-31/HARDENING.md`.
