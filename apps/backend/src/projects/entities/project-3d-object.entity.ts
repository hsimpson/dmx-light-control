import { pk, timestamps } from '@/db/columns.helpers';
import project from '@/projects/entities/project.entity';
import sceneObjectType from '@/projects/entities/scene-object-type.entity';
import * as d from 'drizzle-orm/pg-core';
import { doublePrecision, integer, unique, varchar } from 'drizzle-orm/pg-core';

const project3dObject = d.snakeCase.table(
  'project_3d_objects',
  {
    ...pk,
    projectId: integer()
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    sceneObjectTypeId: integer()
      .notNull()
      .references(() => sceneObjectType.id),
    name: varchar({ length: 255 }).notNull(),
    sizeX: doublePrecision(),
    sizeY: doublePrecision(),
    sizeZ: doublePrecision(),
    transform: doublePrecision().array().notNull(),
    ...timestamps,
  },
  table => [unique().on(table.projectId, table.name)],
);

export default project3dObject;
