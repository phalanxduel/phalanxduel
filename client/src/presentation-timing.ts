/**
 * One causal timing language for browser presentation.
 *
 * Durations control presentation only; authoritative state and controls never
 * wait for them. CSS mirrors these semantic names through --motion-* tokens.
 */
export const PRESENTATION_TIMING = {
  cue: {
    attack: 520,
    destroyed: 280,
    overflow: 360,
    deploy: 380,
    bonus: 340,
    phase: 300,
    calculation: 480,
    cinematic: 340,
    terminal: 900,
  },
  combatFeedback: 2_200,
  effects: {
    beam: 440,
    impactDelay: 240,
    impact: 320,
    hit: 400,
    column: 520,
    damage: 720,
    damageStagger: 150,
    suit: 560,
    screenShake: 320,
    deployFlash: 480,
    deployLabel: 620,
    deployFlight: 460,
  },
} as const;
