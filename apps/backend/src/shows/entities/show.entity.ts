import { pk, timestamps } from '@/db/columns.helpers';
import project from '@/projects/entities/project.entity';
import type { ShowLightTrack } from '@/shows/show';
import * as d from 'drizzle-orm/pg-core';
import { jsonb, varchar } from 'drizzle-orm/pg-core';

const show = d.snakeCase.table(
  'shows',
  {
    ...pk,
    projectId: d
      .integer()
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    lightTracks: jsonb().$type<ShowLightTrack[]>().notNull().default([]),
    ...timestamps,
  },
  table => [d.unique().on(table.projectId, table.name)],
);

export default show;
