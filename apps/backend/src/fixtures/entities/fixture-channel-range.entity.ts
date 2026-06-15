import { pk, timestamps } from '@/db/columns.helpers';
import { sql } from 'drizzle-orm';
import * as d from 'drizzle-orm/pg-core';
import { check, integer, varchar } from 'drizzle-orm/pg-core';
import fixtureChannelDefinition from './fixture-channel-definition.entity';

const fixtureChannelRange = d.snakeCase.table(
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

export default fixtureChannelRange;
