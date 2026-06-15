import { pk, timestamps } from '@/db/columns.helpers';
import * as d from 'drizzle-orm/pg-core';
import { integer, pgEnum, unique, varchar } from 'drizzle-orm/pg-core';
import { FixtureChannelPreset } from '../channel-presets';
import fixture from './fixture.entity';

type PresetValue = (typeof FixtureChannelPreset)[keyof typeof FixtureChannelPreset];
const presetValues = Object.values(FixtureChannelPreset) as [PresetValue, ...PresetValue[]];
export const presetEnum = pgEnum('preset', presetValues);

const fixtureChannelDefinition = d.snakeCase.table(
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

export default fixtureChannelDefinition;
