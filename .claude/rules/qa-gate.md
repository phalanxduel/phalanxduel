---
description: QA gate — gameplay and automation must be green before UI or engine changes
paths:
  - "client/src/**"
  - "engine/**"
  - "shared/**"
  - "bin/qa/**"
  - "**/*.test.ts"
  - "server/src/**"
---

Before modifying any file matched by this rule's paths, the QA gate must be green:

- `pnpm qa:playthrough:verify` must pass before any UI change
- `pnpm check` is the primary inner loop (lint + typecheck + tests + schema + replay)
- If either fails, fix it first — do not layer new work on top of broken automation

Do not skip or bypass the gate to unblock other work. If the gate is broken, that IS the work.
