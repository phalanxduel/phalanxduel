import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  uniqueIndex,
  index,
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
    isAdmin: boolean('is_admin').default(false).notNull(),
  },
  (table) => [uniqueIndex('gamertag_unique_idx').on(table.gamertagNormalized, table.suffix)],
);

/**
 * Matches Table (Layer 1/2: Physical/Data Link)
 * Acts as a thin metadata header for a match actor.
 * The canonical state is NOT stored here; it is derived from the match_actions ledger.
 */
export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Static configuration (Immutable for the life of the match)
  config: jsonb('config').notNull(), // MatchParameters (rows, cols, seed, etc.)

  // State Snapshot (L1 Cache)
  // OPTIONAL: Used for fast rehydration of long-running games.
  // The system must be able to function if this is null by replaying match_actions.
  lastSnapshot: jsonb('last_snapshot'), // GameState
  lastSnapshotSeq: integer('last_snapshot_seq'), // The sequence number the snapshot represents

  // Outcome (L1 Cache)
  // Denormalized for fast "Past Games" queries.
  outcome: jsonb('outcome'), // Victory outcome

  // Status (L1 Metadata)
  status: text('status', { enum: ['pending', 'active', 'completed', 'cancelled'] })
    .default('pending')
    .notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Match Actions Ledger (Layer 2: Data Link)
 * The authoritative append-only log of every input to the match.
 * Evaluating this log from sequence 0 results in the current GameState.
 */
export const matchActions = pgTable(
  'match_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('match_id')
      .references(() => matches.id)
      .notNull(),

    // The strict order of actions. Unique constraint enforces L2 integrity.
    sequenceNumber: integer('sequence_number').notNull(),

    // The raw Action PDU from Layer 7 (e.g. { type: 'deploy', cardId: '...' })
    action: jsonb('action').notNull(),

    // Replay Integrity Metadata (Layer 2)
    // Recorded to allow O(1) detection of logic divergence without replaying.
    stateHashAfter: text('state_hash_after').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // ENFORCE ATOMIC SEQUENCING at the database layer
    uniqueIndex('match_seq_idx').on(table.matchId, table.sequenceNumber),
    index('match_id_idx').on(table.matchId),
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
