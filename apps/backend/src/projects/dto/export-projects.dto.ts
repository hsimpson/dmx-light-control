import { ExportTimestampsDto } from '@/db/export-timestamps.dto';
import { Field, Int, ObjectType } from '@nestjs/graphql';
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
export class ProjectExportProjectDto extends ExportTimestampsDto {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project' })
  public publicId: string;

  @Field({ description: 'The name of the project' })
  public name: string;

  @Field(() => [ProjectExportFixtureDto], {
    description: 'The fixture instances patched into this project',
    defaultValue: [],
  })
  @Type(() => ProjectExportFixtureDto)
  public projectFixtures: ProjectExportFixtureDto[];
}

@ObjectType()
export class ProjectExportDocumentDto {
  @Field(() => Int, { description: 'The project export document schema version' })
  public schemaVersion: number;

  @Field(() => [ProjectExportProjectDto], { description: 'The projects included in the export' })
  @Type(() => ProjectExportProjectDto)
  public projects: ProjectExportProjectDto[];
}
