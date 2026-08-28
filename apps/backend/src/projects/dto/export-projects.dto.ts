import { ExportTimestampsDto } from '@/db/export-timestamps.dto';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { GraphQLUUID } from 'graphql-scalars';

@ObjectType()
export class ProjectExportProjectDto extends ExportTimestampsDto {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project' })
  public publicId: string;

  @Field({ description: 'The name of the project' })
  public name: string;
}

@ObjectType()
export class ProjectExportDocumentDto {
  @Field(() => Int, { description: 'The project export document schema version' })
  public schemaVersion: number;

  @Field(() => [ProjectExportProjectDto], { description: 'The projects included in the export' })
  @Type(() => ProjectExportProjectDto)
  public projects: ProjectExportProjectDto[];
}
