import { pk, timestamps } from '@/db/columns.helpers';
import project from '@/projects/entities/project.entity';
import { ProjectFunctionProperties, ProjectFunctionType } from '@/projects/project-function';
import * as d from 'drizzle-orm/pg-core';
import { jsonb, varchar } from 'drizzle-orm/pg-core';

type ProjectFunctionTypeValue = (typeof ProjectFunctionType)[keyof typeof ProjectFunctionType];
const projectFunctionTypeValues = Object.values(ProjectFunctionType) as [
  ProjectFunctionTypeValue,
  ...ProjectFunctionTypeValue[],
];
export const projectFunctionTypeEnum = d.pgEnum('project_function_type', projectFunctionTypeValues);

const projectFunction = d.snakeCase.table(
  'project_functions',
  {
    ...pk,
    projectId: d
      .integer()
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    type: projectFunctionTypeEnum().notNull(),
    properties: jsonb().$type<ProjectFunctionProperties>().notNull(),
    ...timestamps,
  },
  table => [d.unique().on(table.projectId, table.name)],
);

export default projectFunction;
