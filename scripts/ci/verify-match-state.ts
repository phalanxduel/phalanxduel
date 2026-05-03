/**
 * verify-match-state — Match Integrity Utility
 *
 * Runs all three integrity checks for a completed match:
 *   1. Transaction log hash chain continuity (each stateHashBefore == previous stateHashAfter)
 *   2. Final state hash: replayed hash == stored finalStateHash in matches table
 *   3. Event log fingerprint: recomputed SHA-256(events) == stored fingerprint
 *
 * Reconciliation protocol (authoritative source hierarchy):
 *   - The transaction log is the ground truth for action history.
 *   - The finalStateHash in the matches table is set once at game-over and never mutated.
 *   - The event log fingerprint is derived from the transaction log at game-over; if it
 *     diverges, the transaction log takes precedence and the event log should be re-derived.
 *   - If the hash chain is broken, the match has been tampered with or the DB is corrupt;
 *     the failed sequence number identifies the first inconsistent entry.
 *
 * Usage:
 *   tsx scripts/ci/verify-match-state.ts <matchId>
 *   tsx scripts/ci/verify-match-state.ts <matchId> --json
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — one or more checks failed (details in stdout or --json output)
 *   2 — match not found in database
 */

import { MatchRepository } from '../../server/src/db/match-repo.js';
import {
  verifyMatchState as _verifyMatchState,
  type MatchStateVerificationResult,
} from '../../server/src/match-integrity.js';

export type { MatchStateVerificationResult };

export async function verifyMatchState(matchId: string): Promise<MatchStateVerificationResult> {
  const repo = new MatchRepository();
  return _verifyMatchState(matchId, repo);
}

// ── CLI entrypoint ────────────────────────────────────────────────────────────

const [matchId, flag] = process.argv.slice(2);
if (!matchId) {
  console.error('Usage: tsx scripts/ci/verify-match-state.ts <matchId> [--json]');
  process.exit(1);
}

const result = await verifyMatchState(matchId);

if (flag === '--json') {
  console.log(JSON.stringify(result, null, 2));
} else {
  const icon = (ok: boolean) => (ok ? '✅' : '❌');
  console.log(`Match ${matchId}`);
  console.log(
    `  ${icon(result.hashChain.valid)} Hash chain   (${result.hashChain.actionCount} actions)`,
  );
  if (result.hashChain.error) console.log(`    └─ ${result.hashChain.error}`);
  console.log(`  ${icon(result.finalHash.valid)} Final hash`);
  if (!result.finalHash.valid)
    console.log(`    └─ computed=${result.finalHash.computed} stored=${result.finalHash.stored}`);
  console.log(
    `  ${icon(result.eventLog.valid)} Event log fingerprint (${result.eventLog.eventCount} events)`,
  );
  if (result.eventLog.error) console.log(`    └─ ${result.eventLog.error}`);
  if (!result.eventLog.valid && !result.eventLog.error)
    console.log(`    └─ computed=${result.eventLog.computed} stored=${result.eventLog.stored}`);
  console.log(`\n${result.valid ? '✅ All checks passed' : '❌ One or more checks FAILED'}`);
}

if (result.hashChain.actionCount === 0 && !result.eventLog.checked) {
  process.exit(2);
}
if (!result.valid) {
  process.exit(1);
}
