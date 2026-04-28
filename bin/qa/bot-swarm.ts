export type BotPersona = 'born-to-lose' | 'stuck-in-middle' | 'born-to-be-wild';

export interface BotIdentity {
  index: number;
  email: string;
  password: string;
  gamertag: string;
  persona: BotPersona;
}

export interface WavePlanOptions {
  growth: 'fibonacci' | 'fixed';
  waveCount: number;
  cohortSize: number;
  explicitSizes: number[] | null;
  maxBots: number;
}

function zeroPad(index: number, width = 5): string {
  return String(index).padStart(width, '0');
}

export function botPersonaForIndex(index: number): BotPersona {
  switch (index % 3) {
    case 0:
      return 'born-to-lose';
    case 1:
      return 'stuck-in-middle';
    default:
      return 'born-to-be-wild';
  }
}

export function buildBotIdentity(
  index: number,
  prefix: string,
  domain: string,
  passwordPrefix = 'PhxBot!',
): BotIdentity {
  const ordinal = zeroPad(index);
  const persona = botPersonaForIndex(index - 1);
  return {
    index,
    email: `${prefix}+${ordinal}@${domain}`,
    password: `${passwordPrefix}${ordinal}!`,
    gamertag: `Bot${ordinal}`,
    persona,
  };
}

export function buildTournamentIdentity(
  index: number,
  runId: string,
  prefix: string,
  domain: string,
  passwordToken: string,
): BotIdentity {
  const normalizedRun = runId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || zeroPad(index, 3);
  const ordinal = zeroPad(index, 2);
  const persona = botPersonaForIndex(index - 1);
  const gamertag = `Bot${normalizedRun}${ordinal}`.slice(0, 20);
  return {
    index,
    email: `${prefix}+${gamertag.toLowerCase()}@${domain}`,
    password: `PhxBot!${passwordToken}${ordinal}!`,
    gamertag,
    persona,
  };
}

export function parseWaveSizes(raw: string | null | undefined): number[] | null {
  if (!raw) return null;
  const sizes = raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.trunc(value));
  return sizes.length > 0 ? sizes : null;
}

export function deriveWaveSizes(options: WavePlanOptions): number[] {
  if (options.explicitSizes && options.explicitSizes.length > 0) {
    return options.explicitSizes.slice(0, options.waveCount);
  }

  const sizes: number[] = [];
  if (options.growth === 'fixed') {
    for (let i = 0; i < options.waveCount; i++) {
      sizes.push(Math.max(1, options.cohortSize));
    }
    return sizes;
  }

  let previous = 1;
  let current = 1;
  while (sizes.length < options.waveCount) {
    const next = sizes.length < 2 ? 1 : previous + current;
    sizes.push(next);
    previous = current;
    current = next;
    if (sizes.reduce((sum, value) => sum + value, 0) >= options.maxBots) {
      break;
    }
  }

  return sizes.map((size) => Math.max(1, size)).slice(0, options.waveCount);
}

export function selectWavePopulation(existing: BotIdentity[], waveSize: number): BotIdentity[] {
  if (waveSize <= 0) return [];
  if (existing.length >= waveSize) return existing.slice(0, waveSize);
  return existing.slice();
}
