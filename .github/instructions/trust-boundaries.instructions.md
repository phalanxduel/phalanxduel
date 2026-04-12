---
applyTo: "engine/**,server/**,shared/**,docs/gameplay/rules.md"
---

For gameplay, replay, contract, and authoritative-runtime changes:

- Preserve server authority and player-hidden information.
- Review replay, transaction-log, hash, and audit implications before claiming the work is done.
- Update the canonical rules or shared schema when the change alters behavior or wire contracts.
- Prefer explicit, inspectable invariants over implicit assumptions.
- Run the repo-level checks that match the risk, not just staged-file hooks.
- Leave reviewers a clear path from rules or contracts to code, tests, and verification evidence.
