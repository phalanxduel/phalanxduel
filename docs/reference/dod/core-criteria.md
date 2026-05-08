# Core Criteria

Every change in the Phalanx Duel repository must satisfy these seven criteria to be considered "Done."

## 1. Specification Alignment
- [ ] Logic matches the intent described in `docs/gameplay/rules.md` or the relevant ADR.
- [ ] Edge cases identified in the task have been addressed.

## 2. Verification
- [ ] Unit tests cover new/modified logic (`pnpm test`).
- [ ] Playthrough verification passes (`pnpm qa:playthrough:verify`).
- [ ] No regressions in system-wide integrity (`pnpm check`).

## 3. Trust & Safety
- [ ] Player identity protection is maintained (no private IDs leaked).
- [ ] State transitions are deterministic and verifiable.
- [ ] Audit logs reflect meaningful gameplay events.

## 4. Code Quality
- [ ] Static analysis passes (Lint, Typecheck).
- [ ] Import boundaries are respected (no circular dependencies or leaked engine types).
- [ ] Code follows repository patterns (Zod schemas, XState actors).

## 5. Observability
- [ ] Telemetry spans cover new critical paths.
- [ ] Relevant logs include high-signal metadata.
- [ ] Error conditions are handled and reported correctly via OTel.

## 6. Accessibility & UX
- [ ] UI changes are responsive and performant.
- [ ] Visual feedback (banners, glows) matches the combat explanation model.
- [ ] Keyboard and screen reader accessibility is considered for key flows.

## 7. AI-Assisted Work
- [ ] All generated code has been reviewed by a human for correctness.
- [ ] Backlog state reflects the final implementation.
- [ ] Documentation has been updated to prevent entropy.
