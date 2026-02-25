import './instrument.js'; // Ensure Sentry is initialized
import * as Sentry from '@sentry/node';
import { GameTelemetry } from './telemetry.js';
import { actionsTotal, wsConnections } from './metrics.js';
import { type Action, type GameState, type PlayerState } from '@phalanxduel/shared';

console.log('🚀 Phalanx Duel Sentry (OTel) Integration Verification...');

async function verify() {
  const matchId = 'verification-match-id';
  const action: Action = {
    type: 'pass',
    playerIndex: 0,
    timestamp: new Date().toISOString(),
  };

  // 1. Verify Metrics
  console.log('📊 Emitting metrics...');
  wsConnections.add(1);
  actionsTotal.add(1, { 'action.type': 'pass' });

  // 2. Verify Spans + Breadcrumbs + Errors
  console.log('🕵️ Triggering Game Action span...');
  try {
    await GameTelemetry.recordAction(matchId, action, () => {
      GameTelemetry.recordPhaseTransition(matchId, 'AttackPhase', 'CleanupPhase');

      console.log(
        '📝 This log should carry trace_id if Pino is wired correctly (manual check logs/server.log)',
      );

      return {
        matchId,
        playerId: 'verifier',
        preState: {} as unknown as GameState,
        postState: {
          turnNumber: 1,
          phase: 'AttackPhase',
          players: [{}, {}] as unknown as [PlayerState, PlayerState],
        } as unknown as GameState,
        action,
      };
    });
    console.log('✅ Span recorded.');
  } catch {
    console.error('❌ Action span failed');
  }

  // 3. Verify Error Capture
  console.log('🚨 Capturing test exception...');
  Sentry.captureException(new Error('Sentry Integration Verification Error'));

  console.log('🏁 Verification sequence complete. Flushing envelopes...');
  await Sentry.flush(5000);
  console.log('✨ Envelopes flushed. Check the local collector console output.');
  process.exit(0);
}

verify();
