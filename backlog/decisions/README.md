# Decision Records

`backlog/decisions/` is the canonical source of truth for active architecture
and policy decisions. These records replace the legacy
`docs/system/DECISIONS.md` register.

Each decision lives in its own file under `backlog/decisions/` with frontmatter for:

- `id`
- `title`
- `status`
- `owner`
- `date`

Use decision records for actual Backlog decisions, not general-purpose docs.
Do not create parallel summary docs that merely restate or index a decision
unit; that creates duplicate rendered surfaces and makes the document view look
like an alternate decision register. The canonical decision artifact is the
markdown file in `backlog/decisions/`.

## Units

### 2A. Authority and drift guardrails

- [DEC-2A-001 - Authority model is explicit](decision-001%20-%20DEC-2A-001%20-%20Authority%20model%20is%20explicit.md)
- [DEC-2A-002 - Runtime behavior change updates RULES](decision-002%20-%20DEC-2A-002%20-%20Runtime%20behavior%20change%20updates%20RULES.md)
- [DEC-2A-003 - Drift guardrails CI-enforced](decision-003%20-%20DEC-2A-003%20-%20Drift%20guardrails%20CI-enforced.md)
- [DEC-2A-004 - Backlog-integrated documentation governance](decision-025%20-%20DEC-2A-004%20-%20Backlog-integrated-documentation-governance.md)

### 2B. Runtime architecture

- [DEC-2B-001 - XState adoption engine-first](decision-004%20-%20DEC-2B-001%20-%20XState%20adoption%20engine-first.md)
- [DEC-2B-002 - Deterministic replay hash compatibility](decision-005%20-%20DEC-2B-002%20-%20Deterministic%20replay%20hash%20compatibility.md)
- [DEC-2B-003 - WebSocket-first degraded connectivity fallback](decision-027%20-%20DEC-2B-003%20-%20WebSocket-first%20degraded%20connectivity%20fallback.md)

### 2C. Verification and official-output policy

- [DEC-2C-001 - Verification is policy-based](decision-006%20-%20DEC-2C-001%20-%20Verification%20is%20policy-based.md)
- [DEC-2C-002 - Machine binding in signatures is optional](decision-007%20-%20DEC-2C-002%20-%20Machine%20binding%20in%20signatures%20is%20optional.md)
- [DEC-2C-003 - Official outputs verifiable offline](decision-008%20-%20DEC-2C-003%20-%20Official%20outputs%20verifiable%20offline.md)
- [DEC-2C-004 - Official spectator delay policy](decision-009%20-%20DEC-2C-004%20-%20Official%20spectator%20delay%20policy.md)
- [DEC-2C-005 - Hidden-state reveal default](decision-010%20-%20DEC-2C-005%20-%20Hidden-state%20reveal%20default.md)

### 2D. Event topology and ranked-like policy

- [DEC-2D-001 - Event topology private ingress](decision-011%20-%20DEC-2D-001%20-%20Event%20topology%20private%20ingress.md)
- [DEC-2D-002 - Production analytics derived-feature stream](decision-012%20-%20DEC-2D-002%20-%20Production%20analytics%20derived-feature%20stream.md)
- [DEC-2D-003 - Public stream post-state payloads](decision-013%20-%20DEC-2D-003%20-%20Public%20stream%20post-state%20payloads.md)
- [DEC-2D-004 - Ranked-like mode guest aliases](decision-014%20-%20DEC-2D-004%20-%20Ranked-like%20mode%20guest%20aliases.md)
- [DEC-2D-005 - Stable cross-match pseudonyms](decision-015%20-%20DEC-2D-005%20-%20Stable%20cross-match%20pseudonyms.md)
- [DEC-2D-006 - Scope is Duel first](decision-016%20-%20DEC-2D-006%20-%20Scope%20is%20Duel%20first.md)

### 2E. API and Decoupling

- [DEC-2E-001 - Authoritative View Model Projection](decision-017%20-%20DEC-2E-001%20-%20Authoritative-View-Model-Projection.md)
- [DEC-2E-002 - Native Zod Schema Conversion for OpenAPI](decision-018%20-%20DEC-2E-002%20-%20Native-Zod-Schema-Conversion-for-OpenAPI.md)
- [DEC-2E-003 - Inlined Route Schemas for Specification Completeness](decision-019%20-%20DEC-2E-003%20-%20Inlined-Route-Schemas-for-Specification-Completeness.md)
- [DEC-2E-004 - Centralized Game Rule Schemas](decision-020%20-%20DEC-2E-004%20-%20Centralized-Game-Rule-Schemas.md)
- [DEC-2E-005 - Predictive Simulation Endpoint](decision-021%20-%20DEC-2E-005%20-%20Predictive-Simulation-Endpoint.md)

### 2F. Observability

- [DEC-2F-001 - OTel-native observability and Sentry deprecation](decision-026%20-%20DEC-2F-001%20-%20OTel-native%20observability%20and%20Sentry%20deprecation.md)

### 2G. Client presentation and usability

- [DEC-2G-001 - Client UI/UX audit and remediation plan](decision-028%20-%20DEC-2G-001%20-%20Client%20UI-UX%20audit%20and%20remediation%20plan.md)

## Open Decisions

- [DEC-OPEN-2C-001 - Final signing profile defaults](decision-022%20-%20DEC-OPEN-2C-001%20-%20Final%20signing%20profile%20defaults.md)
- [DEC-OPEN-2D-001 - Long-term private ingress audit storage](decision-023%20-%20DEC-OPEN-2D-001%20-%20Long-term%20private%20ingress%20audit%20storage.md)
- [DEC-OPEN-2D-002 - Stable pseudonym provider implementation](decision-024%20-%20DEC-OPEN-2D-002%20-%20Stable%20pseudonym%20provider%20implementation.md)
