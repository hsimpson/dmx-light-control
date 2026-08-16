import { pk, timestamps } from '@/db/columns.helpers';
import * as d from 'drizzle-orm/pg-core';
import { varchar } from 'drizzle-orm/pg-core';

const project = d.snakeCase.table('projects', {
  ...pk,
  name: varchar({ length: 255 }).notNull().unique(),

  ...timestamps,
});

export default project;
