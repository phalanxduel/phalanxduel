# Archival and Retention Policy

This document defines how historical artifacts, stale documentation, and AI-generated work products are managed to maintain a "hardened" repository context.

## Goals

1.  **Context Density**: Ensure active directories (`docs/`, `src/`, `backlog/`) contain only current, authoritative information.
2.  **Traceability**: Preserve historical rationale and audit trails without polluting the inner-loop development context.
3.  **AI Signal-to-Noise**: Prevent AI agents from being distracted by stale plans or redundant analysis reports.

## Archival Criteria

Artifacts should be moved to the archive when they are:
-   **Superseded**: A new version of a plan, report, or spec exists.
-   **Historical**: Once-useful analysis or review dumps (e.g., AI production-readiness reports).
-   **Stale**: Material that is no longer accurate but may be useful for future retrospectives.
-   **Completed**: Large-scale planning documents after the implementation is fully verified and landed.

## Storage Locations

### 1. `/archive/` (Root)
The primary location for project-wide historical data not tied to specific tasks.
-   `/archive/ai-reports/`: Dated subdirectories for AI-generated audits and reviews.
-   `/archive/plans/`: Superseded project plans or roadmap iterations.

### 2. `backlog/archive/`
Managed by the `backlog` tool for task-specific archival.
-   `backlog/archive/tasks/`: Duplicate, canceled, or invalid task records.
-   `backlog/archive/milestones/`: Retired milestones.

## Handling of References

When moving files to the archive:
1.  **Update Backlinks**: Search for and update references in active `backlog/tasks` and meta-docs.
2.  **Metadata Preservation**: Keep original filenames and dated subdirectories to maintain chronological order.
3.  **Archival Markers**: (Optional) Add a "STALE/ARCHIVED" warning header to the top of significantly large documents.

## AI Agent Guidance

Archives are labeled so that AI agents understand they are reading historical context.
-   Agents should **not** treat archived documents as authoritative sources of truth.
-   Agents should only consult archives when explicitly asked to "review history" or "compare against previous versions."
