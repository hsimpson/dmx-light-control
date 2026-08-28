import { ImportTimestampsInput } from '@/db/import-timestamps.input';
import { ProjectDto } from '@/projects/dto/project.dto';
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Length, Matches, Max, Min, ValidateNested } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

/** Postgres `uuid` shape (8-4-4-4-12 hex). RFC 4122 variant bits are not required. */
export const IMPORT_PROJECT_PUBLIC_ID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@InputType()
export class ImportProjectFixtureInput extends ImportTimestampsInput {
  @Field(() => GraphQLUUID, { nullable: true, description: 'The public ID of the project fixture instance' })
  @IsOptional()
  @Matches(IMPORT_PROJECT_PUBLIC_ID_PATTERN, { message: 'publicId must be a UUID' })
  public publicId?: string;

  @Field(() => Int, { description: 'The DMX start address of the patched fixture instance' })
  @IsInt()
  @Min(1)
  @Max(512)
  public startAddress: number;

  @Field(() => GraphQLUUID, { description: 'The public ID of the catalog fixture' })
  @Matches(IMPORT_PROJECT_PUBLIC_ID_PATTERN, { message: 'fixturePublicId must be a UUID' })
  public fixturePublicId: string;

  @Field(() => GraphQLUUID, { description: 'The public ID of the channel mode' })
  @Matches(IMPORT_PROJECT_PUBLIC_ID_PATTERN, { message: 'channelModePublicId must be a UUID' })
  public channelModePublicId: string;
}

@InputType()
export class ImportProjectInput extends ImportTimestampsInput {
  @Field(() => GraphQLUUID, { nullable: true, description: 'The public ID of the project' })
  @IsOptional()
  @Matches(IMPORT_PROJECT_PUBLIC_ID_PATTERN, { message: 'publicId must be a UUID' })
  public publicId?: string;

  @Field({ description: 'The name of the project' })
  @IsString()
  @Length(1, 255)
  public name: string;

  @Field(() => [ImportProjectFixtureInput], {
    nullable: true,
    description: 'The fixture instances patched into this project',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportProjectFixtureInput)
  public projectFixtures?: ImportProjectFixtureInput[];
}

@InputType()
export class ImportProjectsInput {
  @Field(() => Int, { description: 'The project export document schema version' })
  @IsInt()
  public schemaVersion: number;

  @Field(() => [ImportProjectInput], { description: 'The projects to import' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportProjectInput)
  public projects: ImportProjectInput[];
}

@ObjectType()
export class ImportProjectsPayload {
  @Field(() => Int, { description: 'The number of projects upserted from the document' })
  public importedCount: number;

  @Field(() => [ProjectDto], { description: 'The imported projects' })
  @Type(() => ProjectDto)
  public projects: ProjectDto[];
}
