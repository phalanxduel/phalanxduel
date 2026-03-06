import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').unique(),
  elo: integer('elo').default(1000).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  player1Id: uuid('player_1_id').references(() => users.id),
  player2Id: uuid('player_2_id').references(() => users.id),

  // For now, these might be guest names if not authenticated
  player1Name: text('player_1_name').notNull(),
  player2Name: text('player_2_name').notNull(),

  config: jsonb('config').notNull(), // MatchParameters
  state: jsonb('state'), // Latest GameState
  actionHistory: jsonb('action_history').default([]).notNull(), // Action[]
  transactionLog: jsonb('transaction_log').default([]).notNull(), // TransactionLogEntry[]

  outcome: jsonb('outcome'), // Victory outcome

  status: text('status', { enum: ['pending', 'active', 'completed', 'cancelled'] })
    .default('pending')
    .notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
