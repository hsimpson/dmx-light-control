import { ExportTimestampsDto } from '@/db/export-timestamps.dto';
import { ProjectEnvironmentType } from '@/projects/project-environment';
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { GraphQLUUID } from 'graphql-scalars';

@ObjectType()
export class ProjectExportFixtureDto extends ExportTimestampsDto {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project fixture instance' })
  public publicId: string;

  @Field(() => Int, { description: 'The DMX start address of the patched fixture instance' })
  public startAddress: number;

  @Field(() => GraphQLUUID, { description: 'The public ID of the catalog fixture' })
  public fixturePublicId: string;

  @Field(() => GraphQLUUID, { description: 'The public ID of the channel mode' })
  public channelModePublicId: string;
}

@ObjectType()
export class ProjectExport3dObjectDto extends ExportTimestampsDto {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project 3D object instance' })
  public publicId: string;

  @Field({ description: 'The display name of the 3D object instance' })
  public name: string;

  @Field(() => GraphQLUUID, { description: 'The public ID of the scene object type' })
  public sceneObjectTypePublicId: string;

  @Field({ description: 'The display name of the scene object type catalog entry' })
  public sceneObjectTypeName: string;

  @Field(() => Float, { nullable: true, description: 'Width in meters for scalable objects' })
  public sizeX: number | null;

  @Field(() => Float, { nullable: true, description: 'Height in meters for scalable objects' })
  public sizeY: number | null;

  @Field(() => Float, { nullable: true, description: 'Length in meters for scalable objects' })
  public sizeZ: number | null;

  @Field(() => [Float], { description: 'Column-major 4×4 transform (16 values)' })
  public transform: number[];
}

@ObjectType()
export class ProjectExportProjectDto extends ExportTimestampsDto {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project' })
  public publicId: string;

  @Field({ description: 'The name of the project' })
  public name: string;

  @Field(() => ProjectEnvironmentType, { description: 'The 3D environment used by the project' })
  public environmentType: ProjectEnvironmentType;

  @Field(() => Float, { description: 'Room width in meters' })
  public roomWidth: number;

  @Field(() => Float, { description: 'Room length in meters' })
  public roomLength: number;

  @Field(() => Float, { description: 'Room height in meters' })
  public roomHeight: number;

  @Field(() => [ProjectExportFixtureDto], {
    description: 'The fixture instances patched into this project',
    defaultValue: [],
  })
  @Type(() => ProjectExportFixtureDto)
  public projectFixtures: ProjectExportFixtureDto[];

  @Field(() => [ProjectExport3dObjectDto], {
    description: 'The 3D scene objects placed in this project',
    defaultValue: [],
  })
  @Type(() => ProjectExport3dObjectDto)
  public project3dObjects: ProjectExport3dObjectDto[];
}

@ObjectType()
export class ProjectExportDocumentDto {
  @Field(() => Int, { description: 'The project export document schema version' })
  public schemaVersion: number;

  @Field(() => [ProjectExportProjectDto], { description: 'The projects included in the export' })
  @Type(() => ProjectExportProjectDto)
  public projects: ProjectExportProjectDto[];
}
