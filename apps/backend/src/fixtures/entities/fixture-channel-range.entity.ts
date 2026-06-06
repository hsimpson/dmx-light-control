import { pk, timestamps } from '@/db/columns.helpers';
import { relations, sql } from 'drizzle-orm';
import { check, integer, pgTable, varchar } from 'drizzle-orm/pg-core';
import fixtureChannelDefinition from './fixture-channel-definition.entity';

const fixtureChannelRange = pgTable(
  'fixture_channel_ranges',
  {
    ...pk,
    fixtureChannelDefinitionId: integer()
      .notNull()
      .references(() => fixtureChannelDefinition.id, { onDelete: 'cascade' }),
    dmxStart: integer().notNull(),
    dmxEnd: integer().notNull(),
    description: varchar({ length: 255 }).notNull(),
    ...timestamps,
  },
  table => [
    check('dmx_start_bounds', sql`${table.dmxStart} BETWEEN 0 AND 255`),
    check('dmx_end_bounds', sql`${table.dmxEnd} BETWEEN 0 AND 255`),
    check('valid_range_order', sql`${table.dmxStart} <= ${table.dmxEnd}`),
  ],
);

export const fixtureChannelRangeRelations = relations(fixtureChannelRange, ({ one }) => ({
  fixtureChannelDefinition: one(fixtureChannelDefinition, {
    fields: [fixtureChannelRange.fixtureChannelDefinitionId],
    references: [fixtureChannelDefinition.id],
  }),
}));

export type FixtureChannelRange = typeof fixtureChannelRange.$inferSelect;

export default fixtureChannelRange;
