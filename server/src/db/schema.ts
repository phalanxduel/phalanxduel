import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
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
  },
  (table) => [uniqueIndex('gamertag_unique_idx').on(table.gamertagNormalized, table.suffix)],
);

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  player1Id: uuid('player_1_id').references(() => users.id),
  player2Id: uuid('player_2_id').references(() => users.id),

  // For now, these might be guest names if not authenticated
  player1Name: text('player_1_name').notNull(),
  player2Name: text('player_2_name').notNull(),
  botStrategy: text('bot_strategy', { enum: ['random', 'heuristic'] }),

  config: jsonb('config').notNull(), // MatchParameters
  state: jsonb('state'), // Latest GameState
  actionHistory: jsonb('action_history').default([]).notNull(), // Action[]
  transactionLog: jsonb('transaction_log').default([]).notNull(), // TransactionLogEntry[]

  outcome: jsonb('outcome'), // Victory outcome

  // Event log persistence (TASK-45.4)
  eventLog: jsonb('event_log'), // MatchEventLog (full object)
  eventLogFingerprint: text('event_log_fingerprint'), // SHA-256 fingerprint for integrity checks

  status: text('status', { enum: ['pending', 'active', 'completed', 'cancelled'] })
    .default('pending')
    .notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

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
