import { pk, timestamps } from '@/db/columns.helpers';
import * as d from 'drizzle-orm/pg-core';
import { integer, unique } from 'drizzle-orm/pg-core';
import fixtureChannelDefinition from './fixture-channel-definition.entity';
import fixtureChannelMode from './fixture-channel-mode.entity';

const fixtureChannelAssignment = d.snakeCase.table(
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

export default fixtureChannelAssignment;
