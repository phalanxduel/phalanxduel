/**
 * Standardized telemetry keys and values for Phalanx Duel.
 * Aligned with OpenTelemetry and Sentry naming conventions.
 */

/** Span and Event Names */
export const TelemetryName = {
  // Spans
  SPAN_GAME_ACTION: 'game.action',
  SPAN_TURN_CYCLE: 'game.turn',
  SPAN_PHASE_TRANSITION: 'game.phase_transition',
  SPAN_RESOLVE_ATTACK: 'game.resolve_attack',
  SPAN_REINFORCEMENT: 'game.reinforce',
  SPAN_DRAW_PHASE: 'game.draw_phase',

  // Events
  EVENT_PHASE_START: 'game.phase.start',
  EVENT_PHASE_END: 'game.phase.end',
  EVENT_VICTORY: 'game.victory',
  EVENT_STALEMATE: 'game.stalemate',
  EVENT_RULE_TRIGGERED: 'game.rule.triggered',

  // Functional update events (one per action type)
  EVENT_INIT: 'game.init',
  EVENT_DEPLOY: 'game.deploy',
  EVENT_COMBAT_STEP: 'game.combat.step',
  EVENT_PASS: 'game.pass',
  EVENT_REINFORCE: 'game.reinforce.action',
  EVENT_FORFEIT: 'game.forfeit',

  // Match lifecycle events (server-generated, not engine-turn-derived)
  EVENT_MATCH_CREATED: 'match.created',
  EVENT_PLAYER_JOINED: 'player.joined',
  EVENT_GAME_INITIALIZED: 'game.initialized',
  EVENT_GAME_COMPLETED: 'game.completed',
} as const;

/** Standard Attribute Keys */
export const TelemetryAttribute = {
  // Context
  MATCH_ID: 'game.match_id',
  PLAYER_ID: 'game.player_id',
  PLAYER_INDEX: 'game.player_index',
  TURN_NUMBER: 'game.turn_number',
  PHASE: 'game.phase',

  // Action Data
  ACTION_TYPE: 'game.action.type',
  ATTACKING_COLUMN: 'game.action.attacking_column',
  DEFENDING_COLUMN: 'game.action.defending_column',
  CARD_ID: 'game.action.card_id',

  // Outcome
  VICTORY_TYPE: 'game.outcome.victory_type',
  WINNER_INDEX: 'game.outcome.winner_index',
  RULE_NAME: 'game.rule.name',
  DAMAGE_DEALT: 'game.combat.damage',
  OVERFLOW_DAMAGE: 'game.combat.overflow',
} as const;
