import { pk, timestamps } from '@/db/columns.helpers';
import { DEFAULT_ROOM_HEIGHT, DEFAULT_ROOM_LENGTH, DEFAULT_ROOM_WIDTH } from '@/projects/project-room-dimensions';
import * as d from 'drizzle-orm/pg-core';
import { doublePrecision, varchar } from 'drizzle-orm/pg-core';

const project = d.snakeCase.table('projects', {
  ...pk,
  name: varchar({ length: 255 }).notNull().unique(),
  roomWidth: doublePrecision().notNull().default(DEFAULT_ROOM_WIDTH),
  roomLength: doublePrecision().notNull().default(DEFAULT_ROOM_LENGTH),
  roomHeight: doublePrecision().notNull().default(DEFAULT_ROOM_HEIGHT),

  ...timestamps,
});

export default project;
