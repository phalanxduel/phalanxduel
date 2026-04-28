/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

const PREFIXES = [
  'COBALT',
  'NEON',
  'VOID',
  'CARBON',
  'SILICON',
  'RADIAL',
  'FRACTAL',
  'STATIC',
  'KINETIC',
  'ASTRAL',
  'DUSK',
  'ZERO',
  'AXIOM',
  'VECTOR',
  'PRISM',
  'GLITCH',
  'OMEGA',
  'ONYX',
  'CYBER',
  'GRID',
  'NOVA',
  'FLUX',
  'PULSE',
  'QUARK',
  'STORM',
  'ZENITH',
  'TITAN',
  'NEXUS',
  'VALOR',
  'OBSIDIAN',
];

const SUFFIXES = [
  'PHALANX',
  'REVENANT',
  'STRIKER',
  'DRIFT',
  'SENTINEL',
  'VORTEX',
  'GHOST',
  'RAVEN',
  'PROTOCOL',
  'EXEC',
  'CORE',
  'ENGINE',
  'BLADE',
  'KNIGHT',
  'PILOT',
  'AGENT',
  'LINK',
  'NODE',
  'SCRIBE',
  'TOWER',
  'BLITZ',
  'SPARK',
  'THORAX',
  'APEX',
  'RELIC',
  'REAPER',
  'WATCHER',
  'HUNTER',
  'MANTIS',
  'SABER',
];

/**
 * Generates a themed "Vector Brutalist" tactical callsign.
 * Example: COBALT_REVENANT, NEON_PROTOCOL, VOID_STRIKER.
 */
export function generateTacticalCallsign(): string {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  const entropy = Math.floor(Math.random() * 900) + 100; // 100-999
  return `${prefix}_${suffix}_${entropy}`;
}
