/* eslint-disable */
const fs = require('fs');
const path = './server/src/db/schema.ts';
let schema = fs.readFileSync(path, 'utf8');

const newTables = `
export const seasons = pgTable('seasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: integer('number').notNull().unique(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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
`;

if (!schema.includes('seasons')) {
  schema += newTables;
  fs.writeFileSync(path, schema);
  console.log('Schema updated.');
} else {
  console.log('Schema already has seasons table.');
}
