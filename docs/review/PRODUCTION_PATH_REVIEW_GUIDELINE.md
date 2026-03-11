# Phalanx Duel - Production Path Review Guideline

Date: 2026-03-11

This guideline refines the findings in `docs/review/META_ANALYSIS.md`.

It exists because the earlier review corpus was useful but too broad, too uneven, and too easy for reviewers to turn into generic production-readiness commentary. The next phase needs a narrower question:

What is the safest and fastest path from the current project state to a playable, supportable production candidate?

This is not a generic architecture review.
This is not a full repository praise-and-polish pass.
This is not an invitation to restate every possible future idea.

This review should help decide whether the project should:

- invest next in stabilization and hardening
- move forward now with structural platform concepts such as matchmaking and ladder systems
- or split the work by doing only the reversible concept work now while protecting against one-way-door mistakes

## Core Goal

Produce a decision-quality analysis of the path to production across exactly four areas:

1. Game playability
2. Infrastructure and operational readiness
3. Player experience
4. Administrator capabilities

The review must answer the project owner's real prioritization question:

Should the next phase focus on stabilization first, or is it safe to keep building end-to-end platform concepts now without locking in bad technical decisions?

## Mandatory Reviewer Identity

The reviewer must identify both:

- the harness used to run the review
- the exact model used to generate the review

Do not hide behind generic labels such as:

- "Claude family"
- "OpenAI agent"
- "Gemini"
- "coding assistant"

Instead, name both precisely, for example:

- Harness: `Cursor`
- Model: `GPT-5.2`

or

- Harness: `Codex`
- Model: `GPT-5`

or

- Harness: `Claude Code`
- Model: `Claude Opus 4.1`

If the harness itself invokes multiple models, state that explicitly and separate:

- primary model
- secondary model
- where each was used

## Mandatory Output File Naming

The output must be saved under a path that makes the harness and model obvious from the filesystem alone.

Required pattern:

```text
docs/review/<harness-slug>__<model-slug>/production-path-review.md
```

Examples:

```text
docs/review/codex__gpt-5/production-path-review.md
docs/review/cursor__gpt-5.2/production-path-review.md
docs/review/claude-code__claude-opus-4.1/production-path-review.md
docs/review/gemini-cli__gemini-2.5-pro/production-path-review.md
```

At the top of the file, include this metadata block:

```text
Reviewer Harness:
Reviewer Model:
Review Date:
Repository:
Prompt Source:
Verification Depth:
```

`Prompt Source` should point to this file:

`docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md`

## Narrow Scope

Reviewers must stay focused on the four areas below and avoid drifting into general commentary unless it materially changes sequencing decisions.

### 1. Game Playability

Focus on whether a fair, understandable, end-to-end match can be played with confidence.

Look for:

- fairness blockers
- hidden-information leaks
- action-authority failures
- replay and dispute-resolution gaps that undermine trust
- rules gaps that make real matches unreliable
- missing flows needed to actually complete a real match

Do not spend time on cosmetic game-balance speculation unless it blocks real-world playtesting.

### 2. Infrastructure and Operational Readiness

Focus on the minimum technical foundation required to support real external usage.

Look for:

- persistence and recovery risks
- observability gaps
- config and secret handling
- deployment repeatability
- rollback safety
- scaling assumptions that would become expensive to revisit later
- whether ladder or matchmaking work depends on unresolved infrastructure decisions

### 3. Player Experience

Focus on whether a new player can discover, enter, understand, trust, and complete a match.

Look for:

- first-run friction
- rules comprehension gaps
- lobby or match-flow confusion
- trust-damaging UX around errors, reconnects, or disputes
- whether adding matchmaking or ladder now would amplify unresolved UX confusion

### 4. Administrator Capabilities

Focus on whether an operator, moderator, or support person can run the system responsibly.

Look for:

- match dispute tooling
- replay verification capability
- admin diagnostics
- moderation and support flows
- feature controls
- the minimum admin surface required before external players arrive

## The Decision Questions the Review Must Answer

The review must answer these questions directly:

1. What absolutely must be stabilized before building more platform surface area?
2. What can be built now without creating a one-way door?
3. What technical decisions become expensive or dangerous to revisit later?
4. Is it safe to pursue ladder and matchmaking now, or would that multiply unresolved trust or infrastructure problems?
5. What is the minimum viable production bar for:
   - internal playtesting
   - closed beta
   - broader public release

## Mandatory Review Method

Every reviewer must:

1. Read `docs/review/META_ANALYSIS.md` first.
2. Read the most credible prior review artifacts before starting:
   - `docs/review/archive/2026-03-11/Codex-GPT-5-2026-03-10/production-readiness-report-Codex-GPT-5-2026-03-10.md`
   - `docs/review/archive/2026-03-11/Codex-GPT-5/production-readiness-report-Codex-GPT-5.md`
   - `docs/review/archive/2026-03-11/documentation-audit-2026-03-10-2251-codex-gpt-5.json`
   - `docs/review/archive/2026-03-11/documentation-audit-2026-03-11-1200-cursor-gpt-5.2.json`
3. Verify current repository state instead of assuming those reviews are still correct.
4. Run at least a small, explicit verification pass.
5. Distinguish facts from inference.

Minimum verification log:

- commands run
- files inspected
- any runtime probes performed
- anything that could not be verified

If a reviewer does not verify current state, they must say so plainly and lower confidence.

## Evidence Rules

Every major conclusion must include:

- concrete file references
- why the finding matters for sequencing
- whether it is a launch blocker, a concept blocker, a scale blocker, or a post-launch issue

Every report must include a section called:

`Disconfirmed Assumptions`

Use it to record earlier claims that did not hold up under inspection.

Do not cite nonexistent paths.
Do not claim a feature is missing if a concrete endpoint, module, or doc already exists.
Do not award high readiness because architecture looks clean while trust-boundary issues remain unresolved.

## Required Framing for Prioritization

The reviewer must classify recommendations into these buckets:

- Stabilize now
- Safe to build in parallel
- Defer until after concept validation
- One-way door / decide before expanding scope

This classification is more important than generic severity language.

The review should help the owner decide whether ladder, matchmaking, and broader platform work are:

- premature
- safe in parallel
- or the right next step

## Fixed Scorecard

Use only a `1-5` scale.

Score these eight categories:

1. Playability confidence
2. Infrastructure readiness
3. Player experience readiness
4. Administrator readiness
5. Replay and dispute-resolution readiness
6. Trust-boundary integrity
7. Change-safety for future platform work
8. Confidence that ladder/matchmaking can be built now without major rework

Score meanings:

- `1` = unsafe / materially misleading / not fit for the intended phase
- `2` = fragile / workable only for tightly controlled internal use
- `3` = viable for limited external use with explicit constraints
- `4` = solid for the intended phase with manageable follow-up work
- `5` = production-strong with no major doubts in this category

For every score below `4`, explain what would move it up by one level.

## Required Output Structure

Produce the report in this order.

### 1. Executive Decision

Answer in plain language:

- stabilize first
- platform concepts can proceed in parallel
- or pursue a split strategy

State why in 5-10 sentences.

### 2. Current State by the Four Focus Areas

Use these headings only:

- Game Playability
- Infrastructure
- Player Experience
- Administrator Capabilities

Under each heading, identify:

- what is already good enough
- what is blocking the next phase
- what is risky but reversible
- what is a one-way door

### 3. One-Way Door Decisions

List the architectural or product decisions that would become expensive to unwind later.

Examples may include:

- event model contract
- replay persistence format
- trust-boundary model
- match identity and account model
- ladder/ranking data model
- admin audit model

### 4. Build-Now vs Stabilize-Now Table

Create a table with these columns:

- Topic
- Recommendation
- Why now
- Risk if delayed
- Risk if built too early

### 5. Minimum Bars by Phase

Define the minimum required bar for:

- internal playtesting
- closed beta
- public launch

Keep this concrete. Name the missing controls, flows, or guarantees.

### 6. Prioritized Next 10 Work Items

Each item must include:

- short title
- bucket classification
- why it matters
- what it unlocks

### 7. Scorecard

Use the fixed `1-5` scale above.

### 8. Disconfirmed Assumptions

Record earlier review claims that turned out false, stale, or overstated.

### 9. Final Recommendation

End with one explicit recommendation:

- `Stabilize first`
- `Build platform concepts in parallel`
- `Split strategy`

Then explain what the owner should do in the next 2-4 weeks.

## Anti-Patterns to Avoid

Do not:

- produce another broad "production readiness" essay
- spend time on nice-to-have polish
- recommend ladder or matchmaking just because they are strategically interesting
- assume that end-to-end concept validation is always more valuable than hardening
- assume that hardening is always more valuable than proving the concept
- bury the sequencing decision under a long list of unrelated findings
- use inconsistent scoring scales

## The Real Standard

The review is successful only if it helps answer this:

Which work should happen now so the project can become a trustworthy, playable, supportable game without accidentally locking itself into expensive rework later?
