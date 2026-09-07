import { registerEnumType } from '@nestjs/graphql';

export enum ProjectEnvironmentType {
  SimpleGround = 'SimpleGround',
  Room = 'Room',
}

registerEnumType(ProjectEnvironmentType, {
  name: 'ProjectEnvironmentType',
  description: 'The 3D environment used by a project',
});

export type EnvironmentTypePatch = {
  environmentType?: ProjectEnvironmentType;
};

export function optionalEnvironmentType(source: EnvironmentTypePatch): EnvironmentTypePatch {
  const patch: EnvironmentTypePatch = {};
  if (source.environmentType !== undefined) {
    patch.environmentType = source.environmentType;
  }
  return patch;
}

export function environmentTypeForImport(environmentType?: ProjectEnvironmentType): ProjectEnvironmentType {
  return environmentType ?? ProjectEnvironmentType.Room;
}
