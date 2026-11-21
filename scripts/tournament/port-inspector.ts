/**
 * scripts/tournament/port-inspector.ts
 *
 * Inspects canonical Phalanx Duel tournament ports, listeners, DNS, and firewall rules.
 * Usage: pnpm tournament:ports [--json]
 */

import {
  renderAccessibilityMatrixTerminal,
  runAllEndpointChecks,
} from './endpoint-accessibility.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: pnpm tournament:ports [--json]');
    process.exit(0);
  }

  const report = await runAllEndpointChecks();
  if (args.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(renderAccessibilityMatrixTerminal(report));
}

await main();
