# RTK - Rust Token Killer

**Usage**: Token-optimized CLI proxy (60-90% savings on dev operations)

## Meta Commands (always use rtk directly)

```bash
rtk gain              # Show token savings analytics
rtk gain --history    # Show command usage history with savings
rtk discover          # Analyze Claude Code history for missed opportunities
rtk proxy <cmd>       # Execute raw command without filtering (for debugging)
```

## Installation Verification

```bash
rtk --version         # Should show: rtk X.Y.Z
rtk gain              # Should work (not "command not found")
which rtk             # Verify correct binary
```

⚠️ **Name collision**: If `rtk gain` fails, you may have reachingforthejack/rtk (Rust Type Kit) installed instead.

## Hook-Based Usage

All other commands are automatically rewritten by the Claude Code hook.
Example: `git status` → `rtk git status` (transparent, 0 tokens overhead)

Refer to CLAUDE.md for full command reference.

## Mission Status: Combat Explanation Fidelity

### Completed (v1.1.0)
- **Visual Signals**: Implemented column-wide glows (Attack, Target, Reinforce, Resolution) that are visible to both players and spectators.
- **Card Accents**: Added tactical corner borders to `PhxCard` to provide logical feedback directly on the cards.
- **Recovery Logic**: Fixed uninitialized match status and abandonment permissions to ensure graceful degradation when the database is unavailable.
- **Grid Integrity**: Verified that tactical overlays do not disrupt the original pixel-perfect card scaling.

### Completed (v1.2.0)
- **Repository Hygiene**: Standardized documentation hierarchy and excised dead code remnants.
- **Build Stability**: Resolved TS6305 and workspace resolution errors for containerized parity.
- **Semantic Event Normalization**: Enriched `transactionLog` with cause tags (e.g. "HEART SHIELD") to explain combat outcomes in the UI.

### Next Steps
- **Technical Hardening**: Transition `LocalMatchManager` from local in-memory Maps to a distributed-ready pattern using Neon as the primary mapping.
- **Operational Hardening**: Expand the Admin UI with match intervention tools (Force Terminate, Manual Rollback).
- **Combat Banner Refinement**: Finalize the UI banner to consume the enriched explanation data.
