#!/usr/bin/env tsx
import { getCapabilities } from './tool-discovery.js';

async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const capabilities = getCapabilities();

  if (isJson) {
    console.log(JSON.stringify(capabilities, null, 2));
  } else {
    console.log(`\n\x1b[1mPHALANX DUEL CAPABILITIES\x1b[0m`);
    console.log(`---------------------------`);

    const types = [...new Set(capabilities.map((c) => c.type))];
    for (const type of types) {
      console.log(`\n\x1b[34m[${type.toUpperCase()}]\x1b[0m`);
      capabilities.filter((c) => c.type === type).forEach((c) => console.log(`  - ${c.name}`));
    }
  }
}

main();
