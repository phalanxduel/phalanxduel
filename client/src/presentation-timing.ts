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
    // The next narrated cue cannot enter until the focal cinematic has exited.
    cinematic: 1_800,
    terminal: 900,
  },
  overlay: {
    narrationHold: 900,
    phaseHold: 1_050,
    combatFeedback: 2_200,
    exit: 240,
    reducedHold: 700,
  },
  cinematic: {
    hold: 1_500,
    exit: 280,
    reducedHold: 900,
  },
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
    terminalHold: 900,
    terminalExit: 300,
  },
} as const;

export type PresentationState = 'entering' | 'holding' | 'exiting';
