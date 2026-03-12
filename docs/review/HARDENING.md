You are performing a repository hardening and documentation consolidation audit for the current monorepo.

Your job is to inspect the repo carefully and produce a concrete, evidence-based assessment of:

1. whether documentation is current, accurate, non-duplicative, and aligned with the real system
2. whether historical artifacts from earlier work are still relevant, misplaced, stale, superseded, or pure noise
3. whether every meaningful file in the repo can be justified as one of:
   - product code
   - product asset
   - developer tooling
   - QA/test tooling
   - CI/CD or operational tooling
   - documentation
   - temporary / experimental / obsolete material

Your goal is not to preserve everything. Your goal is to reduce noise, harden context, and leave behind a repo that is easier for humans and AI agents to reason about safely.

## Core objectives

Perform a full repository review oriented around hardening, consolidation, and signal-to-noise improvement.

Specifically:

- identify documentation that is duplicated, stale, speculative, contradictory, misplaced, or unnecessarily verbose
- identify files and directories that appear to be remnants of prior experiments, abandoned plans, generated artifacts, or transitional work
- identify missing documentation that is actually necessary for operating, developing, testing, or reasoning about the app
- identify important artifacts from earlier work that still matter and should be preserved, linked, relocated, or rewritten rather than deleted
- identify context files that AI agents are likely to over-read, misread, or be distracted by
- identify places where the repo explains the same thing in multiple documents with drift between them
- identify places where the code is the truth but docs have not caught up
- identify places where docs claim intent, architecture, workflow, or rules that are not reflected in reality
- identify “mystery files” whose purpose is unclear and must be explained, moved, or removed

## Additional concerns you must include

In addition to docs/dev tools/QA tools/CI-CD/product code, explicitly check for these categories too:

- architecture decision records, RFCs, proposals, design notes
- generated files and whether they should be committed
- migration notes, upgrade notes, and one-time execution plans
- scripts with unclear ownership or no documented use
- dead or partial automation
- old agent prompts, AI scratch files, or analysis dumps
- overlapping onboarding docs
- duplicated rule/specification material
- repo hygiene issues that confuse future contributors
- missing ownership boundaries between packages/apps/tools/docs
- missing canonical source declarations, where multiple files appear normative
- missing archival strategy for historically useful but non-operational material
- missing retention/deletion criteria for interim artifacts
- missing “how to verify this is still true” guidance
- mismatch between README-level claims and actual implementation
- mismatch between package-level documentation and monorepo-level documentation
- hidden coupling between tooling and product code
- brittle local workflows that exist only in scripts and not in docs
- CI/CD workflows that are not clearly tied to supported development paths
- test utilities that exist but are undocumented
- outdated snapshots, fixtures, seeds, examples, and mock data
- stale diagrams, screenshots, exported reports, and generated markdown
- placeholder files, aspirational docs, and TODO-heavy docs that masquerade as current truth

## Required audit mindset

Be strict.
Do not assume a file should remain just because it exists.
Do not assume a doc is useful just because it is detailed.
Do not assume a historical artifact is useless just because it is old.

Treat the repo as needing a smaller, sharper, more defensible context surface.

Prefer:
- one canonical source over many overlapping explanations
- concise current truth over sprawling narrative
- explicit archive boundaries over accidental accumulation
- evidence from code and config over prose claims

## Method

1. Inspect the monorepo structure first.
   - Identify top-level apps, packages, tools, docs, scripts, CI config, and infrastructure areas.
   - Infer intended repo shape and major functional boundaries.

2. Inventory documentation and context-bearing files.
   Include, but do not limit yourself to:
   - README files
   - docs/**/*
   - ADRs / RFCs / design docs
   - architecture diagrams
   - contributing docs
   - setup docs
   - QA docs
   - deployment docs
   - AI prompt files
   - planning notes
   - migration or remediation notes
   - package/app local docs

3. Inventory tooling and non-product artifacts.
   Include:
   - scripts
   - bin helpers
   - Makefiles / task runners
   - lint/test/build configs
   - CI workflows
   - devcontainer or environment setup
   - QA helpers
   - replay/debug tools
   - one-off maintenance scripts
   - generated reports or outputs committed to the repo

4. Classify each major artifact by role.
   For each important file or directory, determine whether it is:
   - canonical and required
   - useful but secondary
   - historically relevant and should be archived
   - stale and should be removed
   - duplicated and should be consolidated
   - unclear and requires owner clarification

5. Check for canonical-source drift.
   Determine:
   - what files define the actual source of truth for rules, architecture, workflows, and commands
   - where multiple files compete to be the source of truth
   - where docs should explicitly defer to another file instead of repeating it

6. Check earlier-work artifact relevance.
   Look for traces of earlier implementation or planning phases and assess:
   - does this still inform the app, tooling, or rules?
   - is it superseded?
   - is it implementation history that should move to archive/?
   - is it likely to confuse an AI coding agent if left in place?

7. Check hardening gaps.
   Identify missing or weak areas such as:
   - no clear monorepo map
   - no clear package ownership
   - no canonical commands for build/test/lint/dev
   - no clear environment contract
   - no clear testing strategy
   - no CI/CD explanation
   - no artifact retention policy
   - no archive policy
   - no contributor guidance on where new docs should go
   - no distinction between normative spec and exploratory notes

## Output requirements

Produce your findings in a structured report with the following sections:

# Repository Hardening Audit

## 1. Executive Summary
A concise summary of the repo’s current documentation/context quality, main risks, and highest-value cleanup opportunities.

## 2. Monorepo Shape
A brief description of the major areas of the repo and their apparent purpose.

## 3. Canonical Sources
List the files that currently appear to be canonical sources of truth for:
- product behavior / rules
- architecture
- local development
- testing / QA
- CI/CD / release
- operational tooling
- contributor guidance

Also list where canonical ownership is missing or ambiguous.

## 4. Noise and Duplication Findings
Identify duplicated, stale, overly verbose, contradictory, speculative, or misleading documentation and artifacts.

For each finding include:
- path
- classification
- why it is a problem
- recommended action

Use classifications:
- DELETE
- CONSOLIDATE
- ARCHIVE
- REWRITE
- KEEP
- NEEDS OWNER DECISION

## 5. Earlier Artifact Review
Identify older work products, prompts, reports, plans, scratch files, generated analysis, or transitional documents.

For each:
- path
- likely origin/purpose
- whether it still matters
- whether it should be archived, rewritten, linked, or removed
- risk of leaving it as-is

## 6. Tooling and Operational Artifact Review
Review dev tools, QA tools, CI/CD tooling, and scripts.
Explain whether each major tool/script is:
- real and still used
- undocumented but important
- redundant
- obsolete
- dangerous/confusing because it looks supported but is not

## 7. Missing Documentation
Identify what is actually missing for a hardened repo.
Only include missing docs that materially improve correctness, onboarding, maintenance, QA, or release safety.

## 8. Recommended Target Documentation Model
Propose a minimal documentation architecture for this monorepo.
Include recommended top-level docs and what each should contain.
Favor a compact, durable structure.

## 9. Proposed File Actions
Provide a concrete action list grouped by:
- delete now
- archive
- consolidate into canonical docs
- rewrite soon
- keep as-is

## 10. Risk Notes
Call out anything that could break historical traceability, onboarding, CI/CD, testing, or product understanding if cleaned up carelessly.

## 11. Next-Step Plan
Provide a phased cleanup plan:
- Phase 1: no-risk consolidation and labeling
- Phase 2: archival and deletion of stale artifacts
- Phase 3: canonical doc rewrite / tightening
- Phase 4: guardrails to prevent noise from returning

## 12. Appendix: File Inventory
List the most relevant files/directories reviewed with a one-line classification.

## Important constraints

- Do not make up intent that is not supported by repository evidence.
- Distinguish clearly between fact, inference, and uncertainty.
- Prefer concrete file paths over vague observations.
- Do not rewrite the repo yet unless explicitly asked.
- Do not delete or move anything yet unless explicitly asked.
- Your task is analysis, classification, and recommendation.

## Special instructions for AI-agent context hardening

While reviewing, pay special attention to files that would distort or pollute future AI-agent understanding of the repo, including:
- outdated prompts
- abandoned specs
- duplicate plans
- generated reports
- exploratory notes written as if they were authoritative
- multiple summaries of the same subsystem
- docs that are much longer than the complexity they describe

Call these out explicitly as “AI context hazards” where applicable.

## Final standard

A hardened repo should make it easy for a new human or AI contributor to answer:
- what this monorepo is
- what parts are real
- what docs are authoritative
- how to run it
- how to test it
- how to release it
- what old material still matters
- what can safely be ignored

Optimize for that.
