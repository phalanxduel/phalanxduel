---
description: "Run all CI gates and report pass/fail summary"
model: haiku
allowed-tools: "Bash"
---

Run every CI gate in sequence and report a summary. Execute each command and capture pass/fail status:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm schema:check`
5. `pnpm rules:check`
6. `pnpm build`

After running all gates, output a summary table:

```
| Gate         | Status |
|--------------|--------|
| lint         | PASS/FAIL |
| typecheck    | PASS/FAIL |
| test         | PASS/FAIL |
| schema:check | PASS/FAIL |
| rules:check  | PASS/FAIL |
| build        | PASS/FAIL |
```

If any gate fails, include the error output for that gate.

Do NOT fix any issues. Only report what passed and what failed.
