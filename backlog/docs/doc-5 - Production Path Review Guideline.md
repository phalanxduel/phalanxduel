---
id: doc-5
title: Production Path Review Guideline
type: other
created_date: '2026-03-31 20:35'
updated_date: '2026-03-31 21:39'
---

# Production Path Review Guideline

This is the canonical active prompt for production-path reviews.

This guideline refines the findings in
`archive/docs/2026-03-31/META_ANALYSIS.md`.

## Core Goal

Produce a decision-quality analysis of the safest and fastest path from the
current project state to a playable, supportable production candidate across
exactly four areas:

1. Game playability
2. Infrastructure and operational readiness
3. Player experience
4. Administrator capabilities

The review must answer whether the next phase should focus on stabilization
first, or whether it is safe to keep building end-to-end platform concepts
without locking in bad technical decisions.

## Required Use

- Use a precise reviewer harness and model identity.
- Keep findings tied to concrete repo evidence.
- Distinguish facts from inference.
- Treat `Prompt Source` as:
  `backlog/docs/doc-5 - Production Path Review Guideline.md`
- The former `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md` shim has been
  archived to `archive/docs/2026-03-31/PRODUCTION_PATH_REVIEW_GUIDELINE.md`.

## Required Review Framing

Every review should directly answer:

1. What absolutely must be stabilized before building more platform surface
   area?
2. What can be built now without creating a one-way door?
3. What technical decisions become expensive or dangerous to revisit later?
4. Is it safe to pursue ladder and matchmaking now, or would that multiply
   unresolved trust or infrastructure problems?
5. What is the minimum viable production bar for:
   - internal playtesting
   - closed beta
   - broader public release

## Usage Notes

- Read `archive/docs/2026-03-31/META_ANALYSIS.md` first.
- Read the strongest archived review artifacts before producing a new report.
- Generated outputs remain historical artifacts and belong under
  `archive/ai-reports/`.
