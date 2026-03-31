---
title: "Archival and Retention Policy"
description: "Rules for removing transient stale artifacts from active surfaces while keeping durable history in backlog/completed, docs/history, and git history."
status: active
updated: "2026-03-14"
audience: agent
related:
  - backlog/docs/ai-agent-workflow.md
---

# Archival and Retention Policy

This document defines how historical artifacts, stale documentation, and AI-generated work products are managed to maintain a "hardened" repository context.

## Goals

1.  **Context Density**: Ensure active directories (`docs/`, `src/`, `backlog/`) contain only current, authoritative information.
2.  **Traceability**: Preserve historical rationale and audit trails without polluting the inner-loop development context.
3.  **AI Signal-to-Noise**: Prevent AI agents from being distracted by stale plans or redundant analysis reports.

## Canonical Surfaces

- `backlog/decisions/`: active architecture and policy decisions
- `backlog/docs/`: active workflow docs, active plans, and backlog-owned
  process guidance
- `docs/`: canonical reference documentation
- `backlog/archive/`, `backlog/completed/`, and `docs/history/`: historical or
  completed context that should not compete with active sources
- git history: the default home for deleted transient artifacts that no longer
  deserve a live repo surface

## Archival Criteria

Artifacts should be removed from active surfaces when they are:
-   **Superseded**: A new version of a plan, report, or spec exists.
-   **Historical**: Once-useful analysis or review dumps no longer needed as
    first-class repo artifacts.
-   **Stale**: Material that is no longer accurate and would distract readers.
-   **Completed**: Large-scale planning documents after the implementation is
    fully verified and landed.

## Storage Locations

### 1. `backlog/archive/`
Managed by the `backlog` tool for task-specific archival.
-   `backlog/archive/tasks/`: Duplicate, canceled, or invalid task records.
-   `backlog/archive/milestones/`: Retired milestones.

### 2. `backlog/completed/`
Completed task records and completed backlog-owned docs that still need a live
historical home.

### 3. `docs/history/`
Intentional narrative history that remains useful as published project context.

### 4. Git history
The default location for deleted transient artifacts, old prompts, AI report
dumps, and one-off execution summaries.

## Handling of References

When removing or retiring historical files:
1.  **Update Backlinks**: Search for and update references in active `backlog/tasks` and meta-docs.
2.  **Prefer Deletion for Low-Value Artifacts**: If git history is sufficient,
    delete the file instead of creating a second historical surface.
3.  **Use Completed/History Surfaces Sparingly**: Keep only material that still
    benefits from a stable in-repo path.

## AI Agent Guidance

Historical surfaces are labeled so that AI agents understand they are reading
non-authoritative context.
-   Agents should **not** treat completed/history artifacts as authoritative
    sources of truth.
-   Agents should prefer active docs and decisions first, then task history, and
    only then git history when explicitly asked to review prior states.
