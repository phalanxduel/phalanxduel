# Decision Records

`backlog/decisions/` is the canonical source of truth for active architecture
and policy decisions. These records replace the legacy
`docs/system/DECISIONS.md` register.

Each decision lives in its own file with frontmatter for:

- `id`
- `status`
- `owner`
- `date`

## Units

### 2A. Authority and drift guardrails

- [DEC-2A-001 - Authority model is explicit](DEC-2A-001%20-%20Authority%20model%20is%20explicit.md)
- [DEC-2A-002 - Runtime behavior change updates RULES](DEC-2A-002%20-%20Runtime%20behavior%20change%20updates%20RULES.md)
- [DEC-2A-003 - Drift guardrails CI-enforced](DEC-2A-003%20-%20Drift%20guardrails%20CI-enforced.md)

### 2B. Runtime architecture

- [DEC-2B-001 - XState adoption engine-first](DEC-2B-001%20-%20XState%20adoption%20engine-first.md)
- [DEC-2B-002 - Deterministic replay hash compatibility](DEC-2B-002%20-%20Deterministic%20replay%20hash%20compatibility.md)

### 2C. Verification and official-output policy

- [DEC-2C-001 - Verification is policy-based](DEC-2C-001%20-%20Verification%20is%20policy-based.md)
- [DEC-2C-002 - Machine binding in signatures is optional](DEC-2C-002%20-%20Machine%20binding%20in%20signatures%20is%20optional.md)
- [DEC-2C-003 - Official outputs verifiable offline](DEC-2C-003%20-%20Official%20outputs%20verifiable%20offline.md)
- [DEC-2C-004 - Official spectator delay policy](DEC-2C-004%20-%20Official%20spectator%20delay%20policy.md)
- [DEC-2C-005 - Hidden-state reveal default](DEC-2C-005%20-%20Hidden-state%20reveal%20default.md)

### 2D. Event topology and ranked-like policy

- [DEC-2D-001 - Event topology private ingress](DEC-2D-001%20-%20Event%20topology%20private%20ingress.md)
- [DEC-2D-002 - Production analytics derived-feature stream](DEC-2D-002%20-%20Production%20analytics%20derived-feature%20stream.md)
- [DEC-2D-003 - Public stream post-state payloads](DEC-2D-003%20-%20Public%20stream%20post-state%20payloads.md)
- [DEC-2D-004 - Ranked-like mode guest aliases](DEC-2D-004%20-%20Ranked-like%20mode%20guest%20aliases.md)
- [DEC-2D-005 - Stable cross-match pseudonyms](DEC-2D-005%20-%20Stable%20cross-match%20pseudonyms.md)
- [DEC-2D-006 - Scope is Duel first](DEC-2D-006%20-%20Scope%20is%20Duel%20first.md)

### 2E. API and Decoupling

- [DEC-2E-001 - Authoritative View Model Projection](DEC-2E-001%20-%20Authoritative%20View%20Model%20Projection.md)
- [DEC-2E-002 - Native Zod Schema Conversion for OpenAPI](DEC-2E-002%20-%20Native%20Zod%20Schema%20Conversion%20for%20OpenAPI.md)
- [DEC-2E-003 - Inlined Route Schemas for Specification Completeness](DEC-2E-003%20-%20Inlined%20Route%20Schemas%20for%20Specification%20Completeness.md)

## Open Decisions

- [DEC-OPEN-2C-001 - Final signing profile defaults](DEC-OPEN-2C-001%20-%20Final%20signing%20profile%20defaults.md)
- [DEC-OPEN-2D-001 - Long-term private ingress audit storage](DEC-OPEN-2D-001%20-%20Long-term%20private%20ingress%20audit%20storage.md)
- [DEC-OPEN-2D-002 - Stable pseudonym provider implementation](DEC-OPEN-2D-002%20-%20Stable%20pseudonym%20provider%20implementation.md)
