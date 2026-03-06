function fail(message: string): never {
  throw new Error(message);
}

function parsePercent(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    fail(`VITE_AB_LOBBY_PREACT_PERCENT must be a finite number when set. Received: "${raw}"`);
  }

  if (!Number.isInteger(value)) {
    fail(`VITE_AB_LOBBY_PREACT_PERCENT must be an integer in [0, 100]. Received: ${raw}`);
  }

  if (value < 0 || value > 100) {
    fail(`VITE_AB_LOBBY_PREACT_PERCENT must be in [0, 100]. Received: ${raw}`);
  }

  return value;
}

function main(): void {
  const raw = process.env['VITE_AB_LOBBY_PREACT_PERCENT'];
  if (raw === undefined || raw.trim() === '') {
    console.log('Feature flag env check: VITE_AB_LOBBY_PREACT_PERCENT unset (ok).');
    return;
  }

  const parsed = parsePercent(raw.trim());
  console.log(`Feature flag env check: VITE_AB_LOBBY_PREACT_PERCENT=${parsed} (ok).`);
}

main();
