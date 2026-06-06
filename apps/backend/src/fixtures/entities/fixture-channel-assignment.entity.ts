import { pk, timestamps } from '@/db/columns.helpers';
import { relations } from 'drizzle-orm';
import { integer, pgTable, unique } from 'drizzle-orm/pg-core';
import fixtureChannelDefinition from './fixture-channel-definition.entity';
import fixtureChannelMode from './fixture-channel-mode.entity';

const fixtureChannelAssignment = pgTable(
  'fixture_channel_assignments',
  {
    ...pk,
    fixtureChannelModeId: integer()
      .notNull()
      .references(() => fixtureChannelMode.id, { onDelete: 'cascade' }),
    fixtureChannelDefinitionId: integer()
      .notNull()
      .references(() => fixtureChannelDefinition.id, { onDelete: 'cascade' }),
    channelNumber: integer().notNull(),

    ...timestamps,
  },
  table => [unique().on(table.fixtureChannelModeId, table.channelNumber)],
);

export const fixtureChannelAssignmentRelations = relations(fixtureChannelAssignment, ({ one }) => ({
  fixtureChannelMode: one(fixtureChannelMode, {
    fields: [fixtureChannelAssignment.fixtureChannelModeId],
    references: [fixtureChannelMode.id],
  }),
  fixtureChannelDefinition: one(fixtureChannelDefinition, {
    fields: [fixtureChannelAssignment.fixtureChannelDefinitionId],
    references: [fixtureChannelDefinition.id],
  }),
}));

export type FixtureChannelAssignment = typeof fixtureChannelAssignment.$inferSelect;

export default fixtureChannelAssignment;
