import { pk, timestamps } from '@/db/columns.helpers';
import { relations } from 'drizzle-orm';
import { integer, pgTable, unique, varchar } from 'drizzle-orm/pg-core';
import fixtureChannelAssignment from './fixture-channel-assignment.entity';
import fixture from './fixture.entity';

const fixtureChannelMode = pgTable(
  'fixture_channel_modes',
  {
    ...pk,
    fixtureId: integer()
      .notNull()
      .references(() => fixture.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    ...timestamps,
  },
  table => [unique().on(table.fixtureId, table.name)],
);

export const fixtureChannelModeRelations = relations(fixtureChannelMode, ({ one, many }) => ({
  fixture: one(fixture, {
    fields: [fixtureChannelMode.fixtureId],
    references: [fixture.id],
  }),
  fixtureChannelAssignments: many(fixtureChannelAssignment),
}));

export type FixtureChannelMode = typeof fixtureChannelMode.$inferSelect;

export default fixtureChannelMode;
