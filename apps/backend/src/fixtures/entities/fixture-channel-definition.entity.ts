import { pk, timestamps } from '@/db/columns.helpers';
import { relations } from 'drizzle-orm';
import { integer, pgEnum, pgTable, unique, varchar } from 'drizzle-orm/pg-core';
import { FixtureChannelPreset } from '../channel-presets';
import fixtureChannelAssignment from './fixture-channel-assignment.entity';
import fixtureChannelRange from './fixture-channel-range.entity';
import fixture from './fixture.entity';

type PresetValue = (typeof FixtureChannelPreset)[keyof typeof FixtureChannelPreset];
const presetValues = Object.values(FixtureChannelPreset) as [PresetValue, ...PresetValue[]];
export const presetEnum = pgEnum('preset', presetValues);

const fixtureChannelDefinition = pgTable(
  'fixture_channel_definitions',
  {
    ...pk,
    fixtureId: integer()
      .notNull()
      .references(() => fixture.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    order: integer().notNull().default(0),
    preset: presetEnum().notNull(),

    ...timestamps,
  },
  table => [unique().on(table.fixtureId, table.name)],
);

export const fixtureChannelDefinitionRelations = relations(fixtureChannelDefinition, ({ one, many }) => ({
  fixture: one(fixture, {
    fields: [fixtureChannelDefinition.fixtureId],
    references: [fixture.id],
  }),
  fixtureChannelRanges: many(fixtureChannelRange),
  fixtureChannelAssignments: many(fixtureChannelAssignment),
}));

export type FixtureChannelDefinition = typeof fixtureChannelDefinition.$inferSelect;

export default fixtureChannelDefinition;
