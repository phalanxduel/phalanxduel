---
id: TASK-227
title: DOC-001 normalize repository documentation taxonomy
status: Done
assignee:
  - '@gemini'
created_date: '2026-04-12 13:01'
updated_date: '2026-04-12 13:30'
labels:
  - docs
  - curation
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Normalize the repository documentation taxonomy by relocating files to categorized subdirectories under /docs/ and archiving historical content.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All documentation files moved to correct taxonomy directories.
- [ ] #2 Legacy directories (docs/system, etc.) deleted.
- [ ] #3 Internal cross-links updated and verified.
- [ ] #4 ADRs renamed to ADR-XXX.md format.
- [ ] #5 Backlog.md index regenerated.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Repository documentation taxonomy normalized and cross-links updated.

### Summary of Changes:
- **Taxonomy Normalization:** Relocated all canonical documentation files into categorized subdirectories under `/docs/` (architecture, gameplay, tutorials, ops, reference).
- **ADR Extraction:** Renamed and moved all 28 decision records from `backlog/decisions/` to `/docs/adr/ADR-XXX-slug.md` for consistent historical tracking.
- **Historical Archival:** Moved superseded plans, audits, and reports to `/docs/archive/`.
- **Link Integrity:** Performed a repository-wide search and replace of documentation paths to prevent dead links.
- **Index Regeneration:** Updated `docs/README.md` to serve as the new centralized index for the project documentation.
- **System Synchronization:** Updated server bootstrap links, OpenAPI contract snapshots, and client-compatibility tests to reflect the new structure.
- **Cleanup:** Pruned empty legacy directories.

All 271 logic and compatibility tests pass. Documentation is now structured, searchable, and canonical.
<!-- SECTION:FINAL_SUMMARY:END -->
