---
description: "Read ROADMAP.md and report next phase to implement"
model: sonnet
allowed-tools: "Read, Bash, Grep, Glob"
---

Read the implementation roadmap and determine what to work on next.

## Steps

1. Read `.claude/ROADMAP.md`
2. Parse the phase status list at the top (look for `- [x]`, `- [>]`, `- [ ]` markers)
3. Identify the next actionable phase: the first `[ ]` phase whose dependencies are all `[x]`
4. Read that phase's section for deliverables, agent, and acceptance criteria
5. Check if any phase is `[>]` (in progress) — if so, that takes priority

## Output Format

```markdown
## Phalanx Project Status

### Completed
- Phase 0: ... ✓
- Phase 1: ... ✓

### In Progress
- Phase N: ... (if any)

### Next Up
**Phase N: <title>**
- **Agent:** `<agent-name>` (model)
- **Dependencies:** all met ✓
- **Deliverables:** (list from roadmap)
- **Acceptance:** (commands from roadmap)

### Recommended Action
> <specific command or instruction to start the next phase>
> Example: "Use `/implement-rule PHX-DEPLOY-001` to start Phase 2"
```

## Rules

1. **Do NOT auto-execute.** Present the plan and let the user decide.
2. **Check dependencies.** A phase is only actionable if ALL its dependency phases are `[x]`.
3. **Prioritize in-progress.** If a phase is `[>]`, recommend continuing it rather than starting a new one.
4. **Be specific.** Name the exact agent, command, or rule ID to work on next.
