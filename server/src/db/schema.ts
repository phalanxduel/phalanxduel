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
  vector,
} from 'drizzle-orm/pg-core';

// == Schema Information ==
// Table name: users
//
//  id                      :uuid       primary key, not null, default: gen_random_uuid()
//  gamertag                :text       not null
//  gamertag_normalized     :text       not null
//  suffix                  :integer
//  gamertag_changed_at     :timestamp
//  email                   :text       not null, unique
//  password_hash           :text       not null
//  elo                     :integer    not null, default: 1000
//  favorite_suit           :text       enum: ['spades', 'hearts', 'diamonds', 'clubs']
//  tagline                 :text
//  avatar_icon             :text
//  created_at              :timestamp  not null, default: now()
//  updated_at              :timestamp  not null, default: now()
//  email_notifications     :boolean    not null, default: true
//  reminder_notifications  :boolean    not null, default: true
//  email_verified_at       :timestamp
//  marketing_consent_at    :timestamp
//  legal_consent_version   :text
//  is_admin                :boolean    not null, default: false
//  matches_created         :integer    not null, default: 0
//  successful_starts       :integer    not null, default: 0
//  login_failed_attempts   :integer    not null, default: 0
//  login_locked_until      :timestamp
//  security_stamp          :text
//  is_disabled             :boolean    not null, default: false
//  disabled_reason         :text
//  disabled_at             :timestamp
//  equipped_card_skin      :text       not null, default: default
//
// Indexes:
//  gamertag_unique_idx (gamertag_normalized, suffix) UNIQUE
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
    isDisabled: boolean('is_disabled').default(false).notNull(),
    disabledReason: text('disabled_reason'),
    disabledAt: timestamp('disabled_at'),
    equippedCardSkin: text('equipped_card_skin').default('default').notNull(),
  },
  (table) => [uniqueIndex('gamertag_unique_idx').on(table.gamertagNormalized, table.suffix)],
);

// == Schema Information ==
// Table name: matches
//
//  id                           :uuid       primary key, not null, default: gen_random_uuid()
//  player_1_id                  :uuid       references: users(id)
//  player_2_id                  :uuid       references: users(id)
//  visibility                   :text       not null, default: private, enum: ['private', 'public_open']
//  public_status                :text       enum: ['open', 'claimed', 'expired', 'cancelled']
//  public_expires_at            :timestamp
//  min_public_rating            :integer
//  max_public_rating            :integer
//  min_games_played             :integer
//  requires_established_rating  :boolean    not null, default: false
//  player_1_name                :text
//  player_2_name                :text
//  player_1_card_skin           :text       not null, default: default
//  player_2_card_skin           :text       not null, default: default
//  bot_strategy                 :text       enum: ['random', 'heuristic', 'mcts']
//  is_automated                 :boolean    not null, default: false
//  config                       :jsonb      not null
//  state                        :jsonb
//  action_history               :jsonb      not null, default: []
//  transaction_log              :jsonb      not null, default: []
//  outcome                      :jsonb
//  event_log                    :jsonb
//  event_log_fingerprint        :text
//  final_state_hash             :text
//  status                       :text       not null, default: pending, enum: ['pending', 'active', 'completed', 'cancelled']
//  last_action_at               :timestamp
//  creator_ip                   :text
//  created_at                   :timestamp  not null, default: now()
//  updated_at                   :timestamp  not null, default: now()
//
// Indexes:
//  matches_visibility_status_idx (visibility, public_status, created_at)
//
// Foreign Keys:
//  player_1_id -> users(id)
//  player_2_id -> users(id)
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
    player1CardSkin: text('player_1_card_skin').default('default').notNull(),
    player2CardSkin: text('player_2_card_skin').default('default').notNull(),
    botStrategy: text('bot_strategy', { enum: ['random', 'heuristic', 'mcts'] }),
    isAutomated: boolean('is_automated').notNull().default(false),

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
    creatorIp: text('creator_ip'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('matches_visibility_status_idx').on(
      table.visibility,
      table.publicStatus,
      table.createdAt,
    ),
  ],
);

// == Schema Information ==
// Table name: transaction_logs
//
//  id                 :uuid       primary key, not null, default: gen_random_uuid()
//  match_id           :uuid       not null, references: matches(id)
//  sequence_number    :integer    not null
//  action             :jsonb      not null
//  state_hash_before  :text       not null
//  state_hash_after   :text       not null
//  events             :jsonb      not null
//  msg_id             :text
//  created_at         :timestamp  not null, default: now()
//
// Indexes:
//  match_seq_idx (match_id, sequence_number) UNIQUE
//  transaction_logs_msg_id_idx (match_id, msg_id) UNIQUE
//
// Foreign Keys:
//  match_id -> matches(id)
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

// == Schema Information ==
// Table name: elo_snapshots
//
//  id                 :uuid       primary key, not null, default: gen_random_uuid()
//  user_id            :uuid       not null, references: users(id)
//  category           :text       not null, enum: ['pvp', 'sp-random', 'sp-heuristic', 'sp-mcts']
//  elo                :integer    not null
//  k_factor           :integer    not null
//  window_days        :integer    not null
//  matches_in_window  :integer    not null
//  wins_in_window     :integer    not null
//  computed_at        :timestamp  not null, default: now()
//
// Indexes:
//  elo_snapshots_user_category_idx (user_id, category, computed_at)
//
// Foreign Keys:
//  user_id -> users(id)
export const eloSnapshots = pgTable(
  'elo_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    category: text('category', { enum: ['pvp', 'sp-random', 'sp-heuristic', 'sp-mcts'] }).notNull(),
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

// == Schema Information ==
// Table name: player_ratings
//
//  user_id                  :uuid       primary key, not null, references: users(id)
//  mode                     :text       primary key, not null, enum: ['pvp', 'sp-random', 'sp-heuristic', 'sp-mcts']
//  elo_rating               :integer    not null, default: 1000
//  glicko_rating            :integer    not null, default: 1500
//  glicko_rating_deviation  :integer    not null, default: 350
//  glicko_volatility        :real       not null, default: 0.06
//  games_played             :integer    not null, default: 0
//  wins                     :integer    not null, default: 0
//  losses                   :integer    not null, default: 0
//  draws                    :integer    not null, default: 0
//  abandons                 :integer    not null, default: 0
//  provisional              :boolean    not null, default: true
//  last_rated_at            :timestamp
//  created_at               :timestamp  not null, default: now()
//  updated_at               :timestamp  not null, default: now()
//
// Foreign Keys:
//  user_id -> users(id)
export const playerRatings = pgTable(
  'player_ratings',
  {
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    mode: text('mode', { enum: ['pvp', 'sp-random', 'sp-heuristic', 'sp-mcts'] }).notNull(),
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
  (table) => [primaryKey({ columns: [table.userId, table.mode] })],
);

// == Schema Information ==
// Table name: match_results
//
//  match_id          :uuid       primary key, not null, references: matches(id)
//  user_id           :uuid       primary key, not null, references: users(id)
//  opponent_id       :uuid       references: users(id)
//  mode              :text       not null, enum: ['pvp', 'sp-random', 'sp-heuristic', 'sp-mcts']
//  result            :text       not null, enum: ['win', 'loss', 'draw']
//  elo_before        :integer    not null
//  elo_after         :integer    not null
//  elo_delta         :integer    not null
//  glicko_before     :integer    not null
//  glicko_after      :integer    not null
//  glicko_rd_before  :integer    not null
//  glicko_rd_after   :integer    not null
//  created_at        :timestamp  not null, default: now()
//
// Indexes:
//  match_results_user_created_idx (user_id, created_at)
//
// Foreign Keys:
//  match_id -> matches(id)
//  user_id -> users(id)
//  opponent_id -> users(id)
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
    mode: text('mode', { enum: ['pvp', 'sp-random', 'sp-heuristic', 'sp-mcts'] }).notNull(),
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
    index('match_results_user_created_idx').on(table.userId, table.createdAt),
  ],
);

// TASK-96: Durable Ledger — append-only action log for distributed match replay and audit.
// Each row captures one player action along with state hashes for chain verification.
// == Schema Information ==
// Table name: match_actions
//
//  match_id           :uuid       primary key, not null, references: matches(id)
//  sequence_number    :integer    primary key, not null
//  action             :jsonb      not null
//  state_hash_before  :text       not null
//  state_hash_after   :text       not null
//  msg_id             :text
//  created_at         :timestamp  not null, default: now()
//
// Indexes:
//  match_actions_msg_id_idx (match_id, msg_id) UNIQUE
//
// Foreign Keys:
//  match_id -> matches(id)
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

// == Schema Information ==
// Table name: admin_audit_log
//
//  id          :uuid       primary key, not null, default: gen_random_uuid()
//  actor_id    :uuid       not null, references: users(id)
//  action      :text       not null, enum: ['create_match', 'reset_password', 'toggle_admin', 'terminate_match', 'rollback_match']
//  target_id   :uuid
//  metadata    :jsonb
//  created_at  :timestamp  not null, default: now()
//
// Foreign Keys:
//  actor_id -> users(id)
export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id')
    .references(() => users.id)
    .notNull(),
  action: text('action', {
    enum: ['create_match', 'reset_password', 'toggle_admin', 'terminate_match', 'rollback_match'],
  }).notNull(),
  targetId: uuid('target_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// == Schema Information ==
// Table name: password_reset_tokens
//
//  id          :uuid       primary key, not null, default: gen_random_uuid()
//  user_id     :uuid       not null, references: users(id)
//  token_hash  :text       not null
//  expires_at  :timestamp  not null
//  used_at     :timestamp
//  created_at  :timestamp  not null, default: now()
//
// Foreign Keys:
//  user_id -> users(id)
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

// == Schema Information ==
// Table name: identity_audit_log
//
//  id          :uuid       primary key, not null, default: gen_random_uuid()
//  user_id     :uuid       not null, references: users(id)
//  action      :text       not null, enum: ['email_changed', 'password_changed', 'gamertag_changed', 'account_locked']
//  metadata    :jsonb      not null, default: {}
//  ip_address  :text
//  created_at  :timestamp  not null, default: now()
//
// Indexes:
//  identity_audit_log_user_id_idx (user_id, created_at)
//
// Foreign Keys:
//  user_id -> users(id)
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

// == Schema Information ==
// Table name: achievements
//
//  id          :uuid       primary key, not null, default: gen_random_uuid()
//  user_id     :uuid       not null, references: users(id)
//  type        :text       not null
//  awarded_at  :timestamp  not null, default: now()
//  match_id    :text
//  metadata    :jsonb      not null, default: {}
//
// Indexes:
//  achievements_user_id_awarded_at_idx (user_id, awarded_at)
//  achievements_user_type_unique_idx (user_id, type) UNIQUE
//
// Foreign Keys:
//  user_id -> users(id)
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

// == Schema Information ==
// Table name: user_follows
//
//  follower_id   :uuid       primary key, not null, references: users(id)
//  following_id  :uuid       primary key, not null, references: users(id)
//  created_at    :timestamp  not null, default: now()
//
// Indexes:
//  user_follows_following_idx (following_id)
//
// Foreign Keys:
//  follower_id -> users(id)
//  following_id -> users(id)
export const userFollows = pgTable(
  'user_follows',
  {
    followerId: uuid('follower_id')
      .references(() => users.id)
      .notNull(),
    followingId: uuid('following_id')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    index('user_follows_following_idx').on(table.followingId),
  ],
);

// == Schema Information ==
// Table name: match_favorites
//
//  user_id     :uuid       primary key, not null, references: users(id)
//  match_id    :uuid       primary key, not null, references: matches(id)
//  created_at  :timestamp  not null, default: now()
//
// Indexes:
//  match_favorites_match_idx (match_id)
//
// Foreign Keys:
//  user_id -> users(id)
//  match_id -> matches(id)
export const matchFavorites = pgTable(
  'match_favorites',
  {
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    matchId: uuid('match_id')
      .references(() => matches.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.matchId] }),
    index('match_favorites_match_idx').on(table.matchId),
  ],
);

// == Schema Information ==
// Table name: match_ratings
//
//  user_id     :uuid       primary key, not null, references: users(id)
//  match_id    :uuid       primary key, not null, references: matches(id)
//  rating      :integer    not null
//  created_at  :timestamp  not null, default: now()
//  updated_at  :timestamp  not null, default: now()
//
// Indexes:
//  match_ratings_match_idx (match_id)
//
// Foreign Keys:
//  user_id -> users(id)
//  match_id -> matches(id)
export const matchRatings = pgTable(
  'match_ratings',
  {
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    matchId: uuid('match_id')
      .references(() => matches.id)
      .notNull(),
    rating: integer('rating').notNull(), // 1-5 stars
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.matchId] }),
    index('match_ratings_match_idx').on(table.matchId),
  ],
);

// == Schema Information ==
// Table name: match_comments
//
//  id              :uuid       primary key, not null, default: gen_random_uuid()
//  user_id         :uuid       not null, references: users(id)
//  match_id        :uuid       not null, references: matches(id)
//  step            :integer
//  content         :text       not null
//  is_removed      :boolean    not null, default: false
//  removed_at      :timestamp
//  removal_reason  :text
//  created_at      :timestamp  not null, default: now()
//  updated_at      :timestamp  not null, default: now()
//
// Indexes:
//  match_comments_match_idx (match_id, step)
//  match_comments_user_idx (user_id)
//
// Foreign Keys:
//  user_id -> users(id)
//  match_id -> matches(id)
export const matchComments = pgTable(
  'match_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    matchId: uuid('match_id')
      .references(() => matches.id)
      .notNull(),
    step: integer('step'), // Replay sequence number
    content: text('content').notNull(),
    isRemoved: boolean('is_removed').default(false).notNull(),
    removedAt: timestamp('removed_at'),
    removalReason: text('removal_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('match_comments_match_idx').on(table.matchId, table.step),
    index('match_comments_user_idx').on(table.userId),
  ],
);

// Heavy JSONB payload columns for completed matches, decoupled from the hot matches table.
// Rows are written once at archive time and never mutated.
// == Schema Information ==
// Table name: match_payloads
//
//  match_id         :uuid       primary key, not null, references: matches(id)
//  state            :jsonb
//  action_history   :jsonb
//  transaction_log  :jsonb
//  event_log        :jsonb
//  archived_at      :timestamp  not null, default: now()
//
// Foreign Keys:
//  match_id -> matches(id)
export const matchPayloads = pgTable('match_payloads', {
  matchId: uuid('match_id')
    .primaryKey()
    .references(() => matches.id),
  state: jsonb('state'), // Final GameState
  actionHistory: jsonb('action_history'), // Action[]
  transactionLog: jsonb('transaction_log'), // TransactionLogEntry[]
  eventLog: jsonb('event_log'), // MatchEventLog
  archivedAt: timestamp('archived_at').defaultNow().notNull(),
});

// TASK-Vector: Vector embeddings for gameplay pattern analysis.
// == Schema Information ==
// Table name: match_embeddings
//
//  match_id    :uuid       primary key, not null, references: matches(id)
//  embedding   :vector
//  summary     :text
//  version     :integer    not null, default: 1
//  metadata    :jsonb      not null, default: {}
//  created_at  :timestamp  not null, default: now()
//
// Foreign Keys:
//  match_id -> matches(id)
export const matchEmbeddings = pgTable('match_embeddings', {
  matchId: uuid('match_id')
    .primaryKey()
    .references(() => matches.id),
  embedding: vector('embedding', { dimensions: 1536 }), // OpenAI text-embedding-3-small
  summary: text('summary'), // Human-readable summary used to generate embedding
  version: integer('version').default(1).notNull(),
  metadata: jsonb('metadata').default({}).notNull(), // { winnerSuit, duration, turnCount }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// == Schema Information ==
// Table name: seasons
//
//  id          :uuid       primary key, not null, default: gen_random_uuid()
//  number      :integer    not null, unique
//  started_at  :timestamp  not null, default: now()
//  ended_at    :timestamp
//  is_active   :boolean    not null, default: true
//  created_at  :timestamp  not null, default: now()
export const seasons = pgTable('seasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: integer('number').notNull().unique(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// == Schema Information ==
// Table name: season_archives
//
//  id              :uuid       primary key, not null, default: gen_random_uuid()
//  season_id       :uuid       not null, references: seasons(id)
//  user_id         :uuid       not null, references: users(id)
//  category        :text       not null, enum: ['pvp', 'sp-random', 'sp-heuristic', 'sp-mcts']
//  elo             :integer    not null
//  rank            :integer
//  matches_played  :integer    not null
//  wins            :integer    not null
//  archived_at     :timestamp  not null, default: now()
//
// Indexes:
//  season_archives_user_cat_idx (season_id, user_id, category) UNIQUE
//
// Foreign Keys:
//  season_id -> seasons(id)
//  user_id -> users(id)
export const seasonArchives = pgTable(
  'season_archives',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    seasonId: uuid('season_id')
      .references(() => seasons.id)
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    category: text('category', { enum: ['pvp', 'sp-random', 'sp-heuristic', 'sp-mcts'] }).notNull(),
    elo: integer('elo').notNull(),
    rank: integer('rank'),
    matchesPlayed: integer('matches_played').notNull(),
    wins: integer('wins').notNull(),
    archivedAt: timestamp('archived_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('season_archives_user_cat_idx').on(table.seasonId, table.userId, table.category),
  ],
);

// == Schema Information ==
// Table name: cosmetic_products
//
//  id           :uuid       primary key, not null, default: gen_random_uuid()
//  sku          :text       not null, unique
//  name         :text       not null
//  description  :text
//  category     :text       not null, enum: ['card_skin', 'board_theme', 'supporter_pass', 'victory_banner']
//  price_cents  :integer    not null
//  active       :boolean    not null, default: true
//  created_at   :timestamp  not null, default: now()
export const cosmeticProducts = pgTable('cosmetic_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  sku: text('sku').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category', {
    enum: ['card_skin', 'board_theme', 'supporter_pass', 'victory_banner'],
  }).notNull(),
  priceCents: integer('price_cents').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// == Schema Information ==
// Table name: user_entitlements
//
//  id              :uuid       primary key, not null, default: gen_random_uuid()
//  user_id         :uuid       not null, references: users(id)
//  product_id      :uuid       not null, references: cosmetic_products(id)
//  transaction_id  :text       not null, unique
//  platform        :text       not null, enum: ['ios', 'mac', 'web', 'stripe', 'test', 'achievement']
//  granted_at      :timestamp  not null, default: now()
//
// Indexes:
//  user_entitlements_user_prod_idx (user_id, product_id) UNIQUE
//
// Foreign Keys:
//  user_id -> users(id)
//  product_id -> cosmetic_products(id)
export const userEntitlements = pgTable(
  'user_entitlements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    productId: uuid('product_id')
      .references(() => cosmeticProducts.id)
      .notNull(),
    transactionId: text('transaction_id').unique().notNull(),
    platform: text('platform', {
      enum: ['ios', 'mac', 'web', 'stripe', 'test', 'achievement'],
    }).notNull(),
    grantedAt: timestamp('granted_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('user_entitlements_user_prod_idx').on(table.userId, table.productId)],
);
