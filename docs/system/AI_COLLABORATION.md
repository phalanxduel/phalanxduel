# AI Collaboration Expectations

This document defines how humans and AI agents collaborate in Phalanx Duel.

It is not a replacement for
[`docs/system/DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md). It explains how
AI-assisted work is expected to meet that bar.

For the canonical source catalog behind this policy, see
[`docs/system/EXTERNAL_REFERENCES.md`](./EXTERNAL_REFERENCES.md).

## External Foundations

This policy is synthesized from a small set of high-signal sources:

- The 2020 Scrum Guide: Definition of Done is a shared quality commitment, not
  a personal opinion or a vague feeling of completeness.
- NIST SSDF and SSDF-AI: secure development practices must be integrated into
  the lifecycle, including AI-specific development and evaluation concerns.
- NIST AI RMF and AI RMF Playbook: trustworthy AI work needs governance,
  measurement, transparency, and context-specific risk management rather than a
  blind checklist.
- GitHub Copilot official guidance: AI tasks work best when they are
  well-scoped, have explicit acceptance criteria, and are supported by short,
  non-conflicting instructions.
- Google engineering review practices: code review exists to improve overall
  code health, with design, functionality, tests, and documentation treated as
  first-class concerns.

## Non-Negotiables

- AI is a tool, not a replacement for engineering judgment.
- Human reviewers remain accountable for correctness, security, privacy,
  fairness, observability, and maintainability.
- AI-generated output is treated as untrusted until it is reviewed, tested, and
  validated against this repo's standards.
- AI assistance does not lower the Definition of Done. It increases the need for
  explicit expectations and explicit evidence.

## Required Task Framing

When assigning work to an AI agent, the task should include:

- the problem to solve
- the outcome or acceptance criteria
- any known constraints or non-goals
- file, package, or subsystem hints when known
- the verification commands or QA steps expected for completion

For higher-risk work, the task should also state the relevant trust constraints:

- gameplay or fairness expectations
- hidden-information or privacy boundaries
- replay, audit, or persistence expectations
- observability, rollout, and rollback expectations

If these are missing, the agent should narrow the claim, gather context, and
avoid assuming broader authority than the prompt actually gives it.

## Review Expectations For AI-Assisted Changes

AI-assisted changes are reviewed to the same or higher standard as human-only
changes.

Reviewers should explicitly look for:

- design fit within the package and trust boundaries
- correctness and edge cases, not just syntactic plausibility
- useful tests added in the same change when behavior changed
- documentation updates when behavior, commands, or operator workflows changed
- accidental complexity or over-engineering
- security, privacy, and secret-handling regressions
- hidden-state leaks or player-authority regressions on gameplay surfaces
- whether the verification evidence is specific enough to rerun

If a reviewer cannot understand the code or the reasoning trail quickly, that is
itself a valid review concern.

## Instruction File Rules

This repo supports multiple instruction surfaces for AI tools, including
`AGENTS.md`, `CLAUDE.md`, and GitHub Copilot instruction files.

Rules:

- Repository-wide instructions should stay short, self-contained, and broadly
  applicable.
- Use path-specific instructions for narrow concerns instead of overloading one
  giant root instruction file.
- Avoid conflicting guidance across instruction files. If two instruction files
  disagree, response quality becomes less trustworthy.
- Canonical product and workflow docs win over duplicated instruction text.
- Instructions should point agents toward the right source of truth, not attempt
  to restate the entire repo.

## Trustworthiness Lenses For This Repo

Inspired by NIST AI RMF, AI-assisted work in this repository should be assessed
through these lenses:

### Valid and Reliable

- The requested change is specific enough to be implemented and verified.
- Verification commands actually exercise the changed behavior.
- Deterministic, replay-sensitive, or schema-sensitive paths have explicit
  regression coverage.

### Safe, Secure, and Resilient

- Secrets, auth, permissions, and admin/debug surfaces are handled safely.
- AI-produced code is reviewed for insecure defaults, injection risks, hidden
  dependencies, and unsafe operational assumptions.
- Rollback and failure behavior are considered for runtime changes.

### Accountable and Transparent

- The reasoning trail is inspectable through task notes, PR notes, code
  structure, and verification evidence.
- Reviewers can tell what the agent changed, why it changed it, and what still
  needs human judgment.

### Explainable and Interpretable

- The code, docs, and tests make the intent of the change understandable.
- Important invariants, especially around rules, authority, privacy, and
  observability, are easier to find after the change than before it.

### Privacy and Fairness

- Player-hidden information remains protected.
- Fair-play guarantees are not weakened by convenience shortcuts.
- AI assistance does not normalize sloppy handling of logs, telemetry, or data
  that may expose sensitive or trust-critical information.

## What Good Looks Like

A good AI-assisted change in this repo has all of the following:

- one clear concern
- explicit acceptance criteria
- clear pointers to the relevant files or docs
- runnable verification steps
- updated docs or contracts when the behavior changed
- reviewer notes that surface the real risks first

## What Bad Looks Like

These are anti-patterns:

- vague tasks such as "improve this" or "clean up the codebase"
- large mixed-purpose changes with no explicit verification story
- instructions that conflict with one another or with the repo docs
- merging AI output because it "looked right"
- treating passing staged-file hooks as proof that the work is complete
- expecting reviewers to reconstruct the intent, trust assumptions, or test plan from scratch

## Repo-Specific Bottom Line

The purpose of AI collaboration in this project is not to generate more code.
It is to help produce trustworthy, understandable, supportable changes more
quickly without weakening fair play, player trust, developer trust, or the
health of the codebase.
