import { pk, timestamps } from '@/db/columns.helpers';
import * as d from 'drizzle-orm/pg-core';
import { integer, unique, varchar } from 'drizzle-orm/pg-core';
import fixture from './fixture.entity';

const fixtureChannelMode = d.snakeCase.table(
  'fixture_channel_modes',
  {
    ...pk,
    fixtureId: integer()
      .notNull()
      .references(() => fixture.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    order: integer().notNull().default(0),
    ...timestamps,
  },
  table => [unique().on(table.fixtureId, table.name)],
);

export default fixtureChannelMode;
