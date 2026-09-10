import { pk, timestamps } from '@/db/columns.helpers';
import { ProjectEnvironmentType } from '@/projects/project-environment';
import { DEFAULT_ROOM_HEIGHT, DEFAULT_ROOM_LENGTH, DEFAULT_ROOM_WIDTH } from '@/projects/project-room-dimensions';
import * as d from 'drizzle-orm/pg-core';
import { doublePrecision, varchar } from 'drizzle-orm/pg-core';

type EnvironmentTypeValue = (typeof ProjectEnvironmentType)[keyof typeof ProjectEnvironmentType];
const environmentTypeValues = Object.values(ProjectEnvironmentType) as [
  EnvironmentTypeValue,
  ...EnvironmentTypeValue[],
];
export const projectEnvironmentTypeEnum = d.pgEnum('project_environment_type', environmentTypeValues);

const project = d.snakeCase.table('projects', {
  ...pk,
  name: varchar({ length: 255 }).notNull().unique(),
  environmentType: projectEnvironmentTypeEnum().notNull().default(ProjectEnvironmentType.SimpleGround),
  roomWidth: doublePrecision().notNull().default(DEFAULT_ROOM_WIDTH),
  roomLength: doublePrecision().notNull().default(DEFAULT_ROOM_LENGTH),
  roomHeight: doublePrecision().notNull().default(DEFAULT_ROOM_HEIGHT),

  ...timestamps,
});

export default project;
