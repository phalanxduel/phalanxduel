---
title: "AI Agent Instructions"
description: "RTK shell command prefix rule and AI collaboration expectations. Applies to all agents: Claude, Codex, Gemini, Copilot."
status: active
updated: "2026-03-14"
audience: agent
related:
  - backlog/docs/ai-agent-workflow.md
  - docs/system/DEFINITION_OF_DONE.md
---

<!-- backlog-instructions v1 -->
<CRITICAL_INSTRUCTION>

## BACKLOG WORKFLOW INSTRUCTIONS

This project uses Backlog.md MCP for all task and project management activities.

### CRITICAL GUIDANCE

- If your client supports MCP resources, read `backlog://workflow/overview` to understand when and how to use Backlog for this project.
- If your client only supports tools or the above request fails, call `backlog.get_workflow_overview()` tool to load the tool-oriented overview (it lists the matching guide tools).

- **First time working here?** Read the overview resource IMMEDIATELY to learn the workflow
- **Already familiar?** You should have the overview cached ("## Backlog.md Overview (MCP)")
- **When to read it**: BEFORE creating tasks, or when you're unsure whether to track work

These guides cover:
- Decision framework for when to create tasks
- Search-first workflow to avoid duplicates
- Links to detailed guides for task creation, execution, and finalization
- MCP tools reference

You MUST read the overview resource to understand the complete workflow. The information is NOT summarized here.

</CRITICAL_INSTRUCTION>
<!-- /backlog-instructions -->

# AI Agent Instructions

## Shell Commands — RTK (All Agents)

**Prefix all shell commands with `rtk`**. RTK compresses output to reduce token consumption. No dedicated filter means pass-through — always safe.

```bash
# ✅ Always use rtk
rtk git status
rtk pnpm test
rtk vitest run

# ✅ In chains
rtk git add . && rtk git commit -m "msg" && rtk git push
```

| Category | Typical savings |
|---|---|
| Tests (vitest, playwright) | 90–99% |
| Build/Lint (tsc, eslint, prettier) | 70–87% |
| Git (status, log, diff, add, commit) | 59–80% |
| GitHub CLI (gh pr, gh run, gh issue) | 26–87% |
| Package managers (pnpm, npm) | 70–90% |
| Files (ls, grep, find) | 60–75% |

## Backlog Workflow

See [`backlog/docs/ai-agent-workflow.md`](backlog/docs/ai-agent-workflow.md) for task lifecycle, WIP limits, branching, and verification expectations.

## AI Collaboration

### Non-Negotiables

- AI is a tool, not a replacement for engineering judgment.
- Human reviewers remain accountable for correctness, security, privacy, fairness, observability, and maintainability.
- AI output is treated as untrusted until reviewed, tested, and validated.
- AI assistance does not lower the Definition of Done.

### Task Framing

When assigning work to an AI agent, include:

- problem to solve, outcome/AC, known constraints
- file/package hints when known
- verification commands expected for completion

For higher-risk work, also state: gameplay/fairness expectations, auth/privacy boundaries, replay/audit expectations, observability/rollback expectations.

If these are missing, narrow the claim, gather context, and avoid assuming broader authority than the prompt gives.

### Review Expectations

AI-assisted changes are reviewed to the same or higher standard. Look for:

- design fit within package and trust boundaries
- correctness and edge cases, not syntactic plausibility
- tests added when behavior changed
- docs updated when behavior, commands, or operator workflows changed
- security, privacy, and secret-handling regressions
- hidden-state or player-authority regressions on gameplay surfaces

### Instruction File Rules

- Keep instruction files short, non-conflicting, and scoped to their surface.
- Point agents toward the right canonical source; don't restate the entire repo.
- If two instruction files disagree, response quality becomes less trustworthy.

### Trustworthiness Lenses (NIST AI RMF)

- **Valid/Reliable**: changes are specific enough to verify; deterministic paths have regression coverage.
- **Safe/Secure/Resilient**: auth, secrets, and admin surfaces handled safely; rollback considered for runtime changes.
- **Accountable/Transparent**: reasoning trail inspectable through task notes, PR notes, and verification evidence.
- **Explainable/Interpretable**: invariants around rules, authority, privacy, and observability are easier to find after the change.
- **Privacy/Fairness**: player-hidden information stays protected; fair-play guarantees not weakened.

### What Good Looks Like

One clear concern, explicit AC, runnable verification steps, updated docs/contracts when behavior changed, reviewer notes that surface real risks first.

### What Bad Looks Like

Vague tasks ("improve this"), large mixed-purpose changes with no verification story, conflicting instructions, merging AI output because it "looked right," treating hook-passing as proof of completion.
