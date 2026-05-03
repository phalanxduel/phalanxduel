import { SeverityNumber } from '@opentelemetry/api-logs';
import { computeStateHash } from '@phalanxduel/shared/hash';
import { emitOtlpLog } from './instrument.js';
import type { MatchRepository } from './db/match-repo.js';

export interface MatchStateVerificationResult {
  matchId: string;
  valid: boolean;
  hashChain: {
    valid: boolean;
    actionCount: number;
    finalStateHash: string | null;
    error?: string;
    failedAtSequence?: number;
  };
  finalHash: {
    valid: boolean;
    computed: string | null;
    stored: string | null;
  };
  eventLog: {
    checked: boolean;
    valid: boolean;
    computed: string | null;
    stored: string | null;
    eventCount: number;
    error?: string;
  };
}

export async function verifyMatchState(
  matchId: string,
  repo: MatchRepository,
): Promise<MatchStateVerificationResult> {
  const [chainResult, storedFinalHash, eventLog] = await Promise.all([
    repo.verifyHashChain(matchId),
    repo.getFinalStateHash(matchId),
    repo.getEventLog(matchId),
  ]);

  const hashChainValid = chainResult.valid && chainResult.actionCount > 0;
  const computedFinalHash = chainResult.finalStateHash;
  const finalHashValid =
    computedFinalHash !== null && storedFinalHash !== null && computedFinalHash === storedFinalHash;

  let eventLogResult: MatchStateVerificationResult['eventLog'];
  if (!eventLog) {
    eventLogResult = {
      checked: false,
      valid: false,
      computed: null,
      stored: null,
      eventCount: 0,
      error: 'Event log not found in database',
    };
  } else {
    let computedFingerprint: string | null = null;
    let fingerprintError: string | undefined;
    try {
      computedFingerprint = computeStateHash(eventLog.events);
    } catch (err) {
      fingerprintError = err instanceof Error ? err.message : String(err);
    }
    eventLogResult = {
      checked: true,
      valid: computedFingerprint !== null && computedFingerprint === eventLog.fingerprint,
      computed: computedFingerprint,
      stored: eventLog.fingerprint,
      eventCount: eventLog.events.length,
      ...(fingerprintError ? { error: fingerprintError } : {}),
    };
  }

  return {
    matchId,
    valid: hashChainValid && finalHashValid && eventLogResult.valid,
    hashChain: chainResult,
    finalHash: {
      valid: finalHashValid,
      computed: computedFinalHash,
      stored: storedFinalHash,
    },
    eventLog: eventLogResult,
  };
}

const SHADOW_SAMPLE_RATE = (() => {
  const raw = process.env.SHADOW_SAMPLE_RATE;
  if (!raw) return 0.1;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.1;
})();

export function shadowVerifyOnComplete(matchId: string, repo: MatchRepository): void {
  if (Math.random() >= SHADOW_SAMPLE_RATE) return;

  void verifyMatchState(matchId, repo)
    .then((result) => {
      const drift = !result.valid;
      const severity = drift ? SeverityNumber.ERROR : SeverityNumber.DEBUG;
      const severityText = drift ? 'ERROR' : 'DEBUG';
      emitOtlpLog(severity, severityText, 'shadow_verify.result', {
        match_id: matchId,
        drift,
        hash_chain_valid: result.hashChain.valid,
        final_hash_valid: result.finalHash.valid,
        event_log_valid: result.eventLog.valid,
        event_count: result.eventLog.eventCount,
        ...(result.hashChain.error ? { hash_chain_error: result.hashChain.error } : {}),
        ...(result.hashChain.failedAtSequence != null
          ? { hash_chain_failed_at: result.hashChain.failedAtSequence }
          : {}),
        ...(result.eventLog.error ? { event_log_error: result.eventLog.error } : {}),
      });
    })
    .catch((err) => {
      emitOtlpLog(SeverityNumber.WARN, 'WARN', 'shadow_verify.error', {
        match_id: matchId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
}
