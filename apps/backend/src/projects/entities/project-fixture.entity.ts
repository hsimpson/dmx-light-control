import { pk, timestamps } from '@/db/columns.helpers';
import fixtureChannelMode from '@/fixtures/entities/fixture-channel-mode.entity';
import fixture from '@/fixtures/entities/fixture.entity';
import project from '@/projects/entities/project.entity';
import { sql } from 'drizzle-orm';
import * as d from 'drizzle-orm/pg-core';
import { check, integer } from 'drizzle-orm/pg-core';

const projectFixture = d.snakeCase.table(
  'project_fixtures',
  {
    ...pk,
    projectId: integer()
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    fixtureId: integer()
      .notNull()
      .references(() => fixture.id),
    fixtureChannelModeId: integer()
      .notNull()
      .references(() => fixtureChannelMode.id),
    startAddress: integer().notNull(),
    ...timestamps,
  },
  table => [check('project_fixture_start_address_bounds', sql`${table.startAddress} BETWEEN 1 AND 512`)],
);

export default projectFixture;
