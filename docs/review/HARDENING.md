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

This prompt may be used in either:

- single-agent mode, where one reviewer performs the full audit
- multi-agent mode, where several scoped reviewers work in parallel and one synthesizer merges their results

If multi-agent mode is used, the coordination rules below are mandatory.

This prompt is intended to be runnable as a report-producing audit. Generated outputs belong under `archive/ai-reports/`, not under `docs/review/`.

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

## Multi-agent coordination contract

For any run that writes a report file, every agent must receive an explicit assignment block before starting:

- `AGENT_ID`: a unique stable identifier for the agent
- `ROLE`: either `reviewer` or `synthesizer`
- `PLATFORM_ID`: the calling tool or client slug, for example `codex`, `cline`, `claude-code`, `cursor`
- `MODEL_ID`: the model slug, for example `gpt-5.2`, `chatgpt-5.1`, `opus-4.1`
- `RUN_DATE`: the run date in `YYYY-MM-DD`
- `SCOPE`: the fixed area this agent owns
- `OUTPUT_DIR`: the directory reserved for this agent's platform/model outputs
- `OUTPUT_PATH`: a unique output file path reserved for this agent
- `INPUT_REPORTS`: required for the synthesizer; the list of reviewer report paths to merge

In single-agent mode, there is exactly one `reviewer`, and its `SCOPE` may be the full repo.

If any required assignment field is missing or ambiguous, stop and request clarification instead of guessing.

In multi-agent mode, also stop if an assignment field appears shared with another agent when it should be unique.

Use these path-normalization rules for `PLATFORM_ID` and `MODEL_ID`:

- lowercase ASCII only
- allowed characters: `a-z`, `0-9`, `.`, `_`, `-`
- replace spaces or slashes with `-`
- keep platform and model as separate path segments, not one combined directory name

The required output layout is:

- `OUTPUT_DIR = archive/ai-reports/<RUN_DATE>/<PLATFORM_ID>/<MODEL_ID>/`
- reviewer `OUTPUT_PATH = <OUTPUT_DIR>/hardening-audit__<AGENT_ID>__reviewer.md`
- synthesizer `OUTPUT_PATH = <OUTPUT_DIR>/hardening-audit__<AGENT_ID>__synthesis.md`

Examples:

- `archive/ai-reports/2026-03-12/codex/gpt-5.2/hardening-audit__codex-r1__reviewer.md`
- `archive/ai-reports/2026-03-12/claude-code/opus-4.1/hardening-audit__claude-s1__synthesis.md`

Historical archives may use older inconsistent naming. Do not copy those older layouts forward.

Prefer path-based scope ownership over section-only ownership. Good reviewer scopes are directory or artifact boundaries such as:

- `client/**`
- `server/**`
- `shared/**`
- `engine/**`
- `scripts/**`
- `.github/**`
- `docs/**`
- top-level config and onboarding docs

Use section-only ownership only when the orchestrator explicitly assigns non-overlapping report sections and names the owning agent for any shared files.

### Scope and ownership rules

- Reviewers own only their assigned `SCOPE`.
- Reviewers may read outside their scope only to understand interfaces, dependencies, canonical sources, or repo-wide claims that affect their scope.
- Reviewers must not silently expand their scope into a second audit lane just because they found something interesting elsewhere.
- The primary owner of a path is the agent whose assigned scope contains that path.
- Shared top-level files must be explicitly assigned to one agent or to the synthesizer. Do not self-assign them ad hoc.
- If a reviewer finds a likely issue in another agent's scope, record it as a cross-scope note with evidence and a suggested owner. Do not classify or action that path as if you own it.

### Output isolation rules

- Create `OUTPUT_DIR` before writing if it does not already exist.
- All generated files for this audit must stay under `archive/ai-reports/<RUN_DATE>/<PLATFORM_ID>/<MODEL_ID>/`.
- Every agent must write only to its own `OUTPUT_PATH`.
- Reviewer output filenames must include the `AGENT_ID`. Do not use a shared default filename.
- Never overwrite, append to, or "clean up" another agent's raw report.
- Non-synthesizer agents must not edit shared aggregate files or merge reports.
- The synthesizer must preserve reviewer reports as immutable inputs and write the aggregate to its own distinct `OUTPUT_PATH`.
- Do not write generated audit output into `docs/review/`, the repo root, or another platform/model directory.
- If the runtime cannot create files, return the report inline but still state the intended `OUTPUT_PATH` and that the write was not performed.

### Conflict handling rules

- If two agents reach different conclusions about the same file or artifact, do not try to resolve the disagreement by overwriting the other report.
- Each reviewer should record a `CONFLICT:` note that includes:
  - path
  - competing claim or classification
  - evidence supporting this agent's view
  - recommended owner or tie-breaker if known
- The synthesizer is responsible for resolving conflicts in the final aggregate.
- Resolve conflicts by evidence quality and spot-checking, not by vote count.
- If the conflict cannot be resolved from repository evidence, preserve the ambiguity explicitly as an owner decision.

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

If `ROLE=reviewer`:

1. Confirm the assignment first.
   - Verify `AGENT_ID`, `PLATFORM_ID`, `MODEL_ID`, `RUN_DATE`, `SCOPE`, `OUTPUT_DIR`, and `OUTPUT_PATH`.
   - Refuse to proceed if the scope is ambiguous or overlaps another agent's ownership.
   - Refuse to proceed if `OUTPUT_DIR` or `OUTPUT_PATH` do not match the required archive layout.

2. Inspect the monorepo structure only enough to place your scope correctly.
   - Identify the top-level apps, packages, tools, docs, scripts, CI config, and infrastructure areas that touch your scope.
   - Infer the boundaries and dependencies that matter for your assigned area.

3. Inventory documentation and context-bearing files within your scope.
   Include, where relevant:
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

4. Inventory tooling and non-product artifacts within your scope.
   Include, where relevant:
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

5. Classify each major in-scope artifact by role.
   For each important file or directory, determine whether it is:
   - canonical and required
   - useful but secondary
   - historically relevant and should be archived
   - stale and should be removed
   - duplicated and should be consolidated
   - unclear and requires owner clarification

6. Check for canonical-source drift that affects your scope.
   Determine:
   - what files define the actual source of truth for rules, architecture, workflows, and commands in or affecting your scope
   - where multiple files compete to be the source of truth
   - where docs should explicitly defer to another file instead of repeating it

7. Check earlier-work artifact relevance within your scope.
   Look for traces of earlier implementation or planning phases and assess:
   - does this still inform the app, tooling, or rules?
   - is it superseded?
   - is it implementation history that should move to archive/?
   - is it likely to confuse an AI coding agent if left in place?

8. Check hardening gaps within your scope and at its interfaces.
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

9. Record cross-scope notes and conflicts explicitly.
   - Mark out-of-scope observations clearly.
   - Hand off likely issues to the owning agent instead of expanding your audit boundary.

If `ROLE=synthesizer`:

1. Read the reviewer reports listed in `INPUT_REPORTS` first.
2. Check that each report has a distinct `AGENT_ID`, `PLATFORM_ID`, `MODEL_ID`, `SCOPE`, and `OUTPUT_PATH`.
3. Map coverage, overlaps, missing areas, and explicit `CONFLICT:` notes.
4. Spot-check repository evidence where reviewer conclusions conflict, look weak, or leave obvious gaps.
5. Produce the final aggregate without altering the raw reviewer reports.
6. Preserve uncertainty where repository evidence does not support a single conclusion.

## Output requirements

If `ROLE=reviewer`, produce a scoped report at `OUTPUT_PATH` with this heading:

# Repository Hardening Audit - Reviewer Report

Begin with an assignment block:

- Agent ID
- Role
- Platform ID
- Model ID
- Run Date
- Scope
- Output Dir
- Output Path
- Cross-scope files consulted

Make every claim explicitly scoped. Do not present a reviewer report as a full repo-wide conclusion unless your scope really is the full repo.

If `ROLE=synthesizer`, produce the final merged report at `OUTPUT_PATH` with this heading:

# Repository Hardening Audit

Begin with a synthesis input block:

- Synthesizer Agent ID
- Platform ID
- Model ID
- Run Date
- Output Dir
- Reviewer reports consumed
- Coverage gaps
- Conflicts resolved
- Conflicts left unresolved

After the role-specific heading above, use the following section structure:

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

Reviewer note:
Only claim canonical ownership for in-scope files or for cross-scope files you directly inspected as dependencies or repo-wide references. Mark anything else as out of scope.

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

Reviewer note:
Do not recommend deletion, consolidation, or rewrite actions for out-of-scope files as if they are fully reviewed. Mark them as cross-scope observations or owner decisions.

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

Reviewer note:
Only include concrete actions for files you own in your assigned scope. Put cross-scope suggestions in clearly labeled handoff notes.

## 10. Risk Notes
Call out anything that could break historical traceability, onboarding, CI/CD, testing, or product understanding if cleaned up carelessly.

## 11. Next-Step Plan
Provide a phased cleanup plan:
- Phase 1: no-risk consolidation and labeling
- Phase 2: archival and deletion of stale artifacts
- Phase 3: canonical doc rewrite / tightening
- Phase 4: guardrails to prevent noise from returning

Reviewer note:
When proposing next steps, separate:
- work this scope owner can do
- work another scope owner should do
- work the synthesizer or repo owner must decide

## 12. Appendix: File Inventory
List the most relevant files/directories reviewed with a one-line classification.

## Important constraints

- Do not make up intent that is not supported by repository evidence.
- Distinguish clearly between fact, inference, and uncertainty.
- Prefer concrete file paths over vague observations.
- Do not rewrite the repo yet unless explicitly asked.
- Do not delete or move anything yet unless explicitly asked.
- Your task is analysis, classification, and recommendation.
- In multi-agent mode, do not overwrite, merge, or normalize another agent's output unless you are the assigned synthesizer.

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
