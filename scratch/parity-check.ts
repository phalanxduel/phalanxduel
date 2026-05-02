import { randomUUID } from 'node:crypto';
import { MatchRepository } from '../server/src/db/match-repo.js';
import { LocalMatchManager, buildMatchEventLog } from '../server/src/match.js';
import { InMemoryEventBus } from '../server/src/event-bus.js';
import { type Action } from '@phalanxduel/shared';

async function runParityCheck() {
  console.log("Starting cross-protocol match parity check...");
  const repository = new MatchRepository();
  const eventBus = new InMemoryEventBus();
  const manager = new LocalMatchManager(repository, undefined, undefined, eventBus);

  // 1. Initialize two matches with the same seed
  const seed = 12345;
  const match1Info = await manager.createMatch('Alice', null, { rngSeed: seed });
  const match2Info = await manager.createMatch('Alice', null, { rngSeed: seed });

  // Join a second player
  await manager.joinMatch(match1Info.matchId, 'Bob', null);
  await manager.joinMatch(match2Info.matchId, 'Bob', null);

  // 2. Perform identical actions
  const firstState = manager.getMatchSync(match1Info.matchId)!.state!;
  console.log("Phase:", firstState.phase, "ActivePlayerIndex:", firstState.activePlayerIndex);
  
  const p0Hand = firstState.players[0]!.hand;
  const p1Hand = firstState.players[1]!.hand;

  const actions: Action[] = [
    { type: 'deploy', playerIndex: 0, cardId: p0Hand[0]!.cardId, column: 0, timestamp: new Date().toISOString() },
    { type: 'deploy', playerIndex: 1, cardId: p1Hand[0]!.cardId, column: 0, timestamp: new Date().toISOString() },
    { type: 'pass', playerIndex: 0, timestamp: new Date().toISOString() },
    { type: 'pass', playerIndex: 1, timestamp: new Date().toISOString() },
  ];

  for (const action of actions) {
    await manager.handleAction(match1Info.matchId, match1Info.playerId, action);
    await manager.handleAction(match2Info.matchId, match2Info.playerId, action);
  }

  // 3. Compare EventLogs
  const log1 = buildMatchEventLog(manager.getMatchSync(match1Info.matchId)!);
  const log2 = buildMatchEventLog(manager.getMatchSync(match2Info.matchId)!);

  console.log("Match 1 Fingerprint:", log1.fingerprint);
  console.log("Match 2 Fingerprint:", log2.fingerprint);

  if (log1.fingerprint === log2.fingerprint) {
    console.log("✅ Parity confirmed: Match states are identical.");
  } else {
    console.error("❌ Parity failed: Divergence detected.");
    // Add logic to deep diff events if needed
  }
}

runParityCheck().catch(console.error);
