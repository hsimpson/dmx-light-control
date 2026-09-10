import { pk, timestamps } from '@/db/columns.helpers';
import { SceneObjectGeometryKind } from '@/projects/scene-object-geometry';
import * as d from 'drizzle-orm/pg-core';
import { boolean, doublePrecision, varchar } from 'drizzle-orm/pg-core';

type GeometryKindValue = (typeof SceneObjectGeometryKind)[keyof typeof SceneObjectGeometryKind];
const geometryKindValues = Object.values(SceneObjectGeometryKind) as [GeometryKindValue, ...GeometryKindValue[]];
export const sceneObjectGeometryKindEnum = d.pgEnum('scene_object_geometry_kind', geometryKindValues);

const sceneObjectType = d.snakeCase.table('scene_object_types', {
  ...pk,
  name: varchar({ length: 255 }).notNull().unique(),
  geometryKind: sceneObjectGeometryKindEnum().notNull(),
  modelPath: varchar({ length: 512 }),
  isScalable: boolean().notNull(),
  defaultSizeX: doublePrecision().notNull(),
  defaultSizeY: doublePrecision().notNull(),
  defaultSizeZ: doublePrecision().notNull(),
  ...timestamps,
});

export default sceneObjectType;
