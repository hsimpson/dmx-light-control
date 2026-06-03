import { pk, timestamps } from '@/db/columns.helpers';
import { integer, pgEnum, pgTable, unique, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm/relations';
import { FixtureChannelPreset } from '../channel-presets';
import fixture from './fixture.entity';

type PresetValue =
  (typeof FixtureChannelPreset)[keyof typeof FixtureChannelPreset];
const presetValues = Object.values(FixtureChannelPreset) as [
  PresetValue,
  ...PresetValue[],
];
export const presetEnum = pgEnum('preset', presetValues);

const channelAssignment = pgTable(
  'channel_assignments',
  {
    ...pk,
    fixtureId: integer()
      .notNull()
      .references(() => fixture.id),
    channelMode: varchar({ length: 255 }).notNull(),
    channelNumber: integer().notNull(),
    preset: presetEnum(),

    ...timestamps,
  },
  (table) => [
    unique().on(table.externalId),
    unique().on(table.fixtureId, table.channelMode, table.channelNumber),
  ],
);

export const channelAssignmentRelations = relations(
  channelAssignment,
  ({ one }) => ({
    fixture: one(fixture, {
      fields: [channelAssignment.fixtureId],
      references: [fixture.id],
    }),
  }),
);

export type ChannelAssignment = typeof channelAssignment.$inferSelect;

export default channelAssignment;
