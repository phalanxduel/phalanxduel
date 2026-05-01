import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  real,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gamertag: text('gamertag').notNull(),
    gamertagNormalized: text('gamertag_normalized').notNull(),
    suffix: integer('suffix'),
    gamertagChangedAt: timestamp('gamertag_changed_at'),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    elo: integer('elo').default(1000).notNull(),
    favoriteSuit: text('favorite_suit', { enum: ['spades', 'hearts', 'diamonds', 'clubs'] }),
    tagline: text('tagline'),
    avatarIcon: text('avatar_icon'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    emailNotifications: boolean('email_notifications').default(true).notNull(),
    reminderNotifications: boolean('reminder_notifications').default(true).notNull(),
    emailVerifiedAt: timestamp('email_verified_at'),
    marketingConsentAt: timestamp('marketing_consent_at'),
    legalConsentVersion: text('legal_consent_version'),
    isAdmin: boolean('is_admin').default(false).notNull(),
    matchesCreated: integer('matches_created').default(0).notNull(),
    successfulStarts: integer('successful_starts').default(0).notNull(),
    loginFailedAttempts: integer('login_failed_attempts').default(0).notNull(),
    loginLockedUntil: timestamp('login_locked_until'),
    securityStamp: text('security_stamp'),
  },
  (table) => [uniqueIndex('gamertag_unique_idx').on(table.gamertagNormalized, table.suffix)],
);

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    player1Id: uuid('player_1_id').references(() => users.id),
    player2Id: uuid('player_2_id').references(() => users.id),
    visibility: text('visibility', { enum: ['private', 'public_open'] })
      .default('private')
      .notNull(),
    publicStatus: text('public_status', { enum: ['open', 'claimed', 'expired', 'cancelled'] }),
    publicExpiresAt: timestamp('public_expires_at'),
    minPublicRating: integer('min_public_rating'),
    maxPublicRating: integer('max_public_rating'),
    minGamesPlayed: integer('min_games_played'),
    requiresEstablishedRating: boolean('requires_established_rating').default(false).notNull(),

    // For now, these might be guest names if not authenticated
    player1Name: text('player_1_name'),
    player2Name: text('player_2_name'),
    botStrategy: text('bot_strategy', { enum: ['random', 'heuristic'] }),

    config: jsonb('config').notNull(), // MatchParameters
    state: jsonb('state'), // Latest GameState
    actionHistory: jsonb('action_history').default([]).notNull(), // Action[]
    transactionLog: jsonb('transaction_log').default([]).notNull(), // TransactionLogEntry[]

    outcome: jsonb('outcome'), // Victory outcome

    // Event log persistence (TASK-45.4)
    eventLog: jsonb('event_log'), // MatchEventLog (full object)
    eventLogFingerprint: text('event_log_fingerprint'), // SHA-256 fingerprint for integrity checks

    // Durable audit trail (TASK-106)
    finalStateHash: text('final_state_hash'), // SHA-256 of final GameState at game completion

    status: text('status', { enum: ['pending', 'active', 'completed', 'cancelled'] })
      .default('pending')
      .notNull(),

    lastActionAt: timestamp('last_action_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('matches_visibility_status_idx').on(
      table.visibility,
      table.publicStatus,
      table.createdAt,
    ),
  ],
);

export const transactionLogs = pgTable(
  'transaction_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('match_id')
      .references(() => matches.id)
      .notNull(),
    sequenceNumber: integer('sequence_number').notNull(),
    action: jsonb('action').notNull(), // Action
    stateHashBefore: text('state_hash_before').notNull(),
    stateHashAfter: text('state_hash_after').notNull(),
    events: jsonb('events').notNull(), // PhalanxEvent[]
    msgId: text('msg_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('match_seq_idx').on(table.matchId, table.sequenceNumber),
    uniqueIndex('transaction_logs_msg_id_idx').on(table.matchId, table.msgId),
  ],
);

export const eloSnapshots = pgTable(
  'elo_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    category: text('category', { enum: ['pvp', 'sp-random', 'sp-heuristic'] }).notNull(),
    elo: integer('elo').notNull(),
    kFactor: integer('k_factor').notNull(),
    windowDays: integer('window_days').notNull(),
    matchesInWindow: integer('matches_in_window').notNull(),
    winsInWindow: integer('wins_in_window').notNull(),
    computedAt: timestamp('computed_at').defaultNow().notNull(),
  },
  (table) => [
    index('elo_snapshots_user_category_idx').on(table.userId, table.category, table.computedAt),
  ],
);

export const playerRatings = pgTable(
  'player_ratings',
  {
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    mode: text('mode', { enum: ['pvp', 'sp-random', 'sp-heuristic'] }).notNull(),
    eloRating: integer('elo_rating').default(1000).notNull(),
    glickoRating: integer('glicko_rating').default(1500).notNull(),
    glickoRatingDeviation: integer('glicko_rating_deviation').default(350).notNull(),
    glickoVolatility: real('glicko_volatility').default(0.06).notNull(),
    gamesPlayed: integer('games_played').default(0).notNull(),
    wins: integer('wins').default(0).notNull(),
    losses: integer('losses').default(0).notNull(),
    draws: integer('draws').default(0).notNull(),
    abandons: integer('abandons').default(0).notNull(),
    provisional: boolean('provisional').default(true).notNull(),
    lastRatedAt: timestamp('last_rated_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.mode] }),
    index('player_ratings_user_mode_idx').on(table.userId, table.mode),
  ],
);

export const matchResults = pgTable(
  'match_results',
  {
    matchId: uuid('match_id')
      .references(() => matches.id)
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    opponentId: uuid('opponent_id').references(() => users.id),
    mode: text('mode', { enum: ['pvp', 'sp-random', 'sp-heuristic'] }).notNull(),
    result: text('result', { enum: ['win', 'loss', 'draw'] }).notNull(),
    eloBefore: integer('elo_before').notNull(),
    eloAfter: integer('elo_after').notNull(),
    eloDelta: integer('elo_delta').notNull(),
    glickoBefore: integer('glicko_before').notNull(),
    glickoAfter: integer('glicko_after').notNull(),
    glickoRdBefore: integer('glicko_rd_before').notNull(),
    glickoRdAfter: integer('glicko_rd_after').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.userId] }),
    index('match_results_match_idx').on(table.matchId),
    index('match_results_user_created_idx').on(table.userId, table.createdAt),
  ],
);

// TASK-96: Durable Ledger — append-only action log for distributed match replay and audit.
// Each row captures one player action along with state hashes for chain verification.
export const matchActions = pgTable(
  'match_actions',
  {
    matchId: uuid('match_id')
      .references(() => matches.id)
      .notNull(),
    sequenceNumber: integer('sequence_number').notNull(),
    action: jsonb('action').notNull(), // Action
    stateHashBefore: text('state_hash_before').notNull(),
    stateHashAfter: text('state_hash_after').notNull(),
    msgId: text('msg_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.sequenceNumber] }),
    uniqueIndex('match_actions_msg_id_idx').on(table.matchId, table.msgId),
  ],
);

export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id')
    .references(() => users.id)
    .notNull(),
  action: text('action', {
    enum: ['create_match', 'reset_password', 'toggle_admin'],
  }).notNull(),
  targetId: uuid('target_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const identityAuditLog = pgTable(
  'identity_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    action: text('action', {
      enum: ['email_changed', 'password_changed', 'gamertag_changed', 'account_locked'],
    }).notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('identity_audit_log_user_id_idx').on(table.userId, table.createdAt)],
);

export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    type: text('type').notNull(),
    awardedAt: timestamp('awarded_at').defaultNow().notNull(),
    matchId: text('match_id'),
    metadata: jsonb('metadata').default({}).notNull(),
  },
  (table) => [
    index('achievements_user_id_awarded_at_idx').on(table.userId, table.awardedAt),
    uniqueIndex('achievements_user_type_unique_idx').on(table.userId, table.type),
  ],
);
