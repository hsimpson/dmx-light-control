import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { FixtureDto } from '@/fixtures/dto/fixture.dto';
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

/** Postgres `uuid` shape (8-4-4-4-12 hex). RFC 4122 variant bits are not required. */
export const IMPORT_PUBLIC_ID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@InputType()
export class ImportFixtureVendorInput {
  @Field(() => GraphQLUUID, { nullable: true, description: 'The public ID of the vendor' })
  @IsOptional()
  @Matches(IMPORT_PUBLIC_ID_PATTERN, { message: 'publicId must be a UUID' })
  public publicId?: string;

  @Field({ description: 'The name of the vendor' })
  @IsString()
  @Length(1, 255)
  public name: string;
}

@InputType()
export class ImportFixtureRangeInput {
  @Field(() => GraphQLUUID, { nullable: true, description: 'The public ID of the channel range' })
  @IsOptional()
  @Matches(IMPORT_PUBLIC_ID_PATTERN, { message: 'publicId must be a UUID' })
  public publicId?: string;

  @Field(() => Int, { description: 'The DMX start value of the channel range' })
  @IsInt()
  @Min(0)
  @Max(255)
  public dmxStart: number;

  @Field(() => Int, { description: 'The DMX end value of the channel range' })
  @IsInt()
  @Min(0)
  @Max(255)
  public dmxEnd: number;

  @Field({ description: 'The description of the channel range' })
  @IsString()
  @Length(1, 1024)
  public description: string;
}

@InputType()
export class ImportFixtureDefinitionInput {
  @Field(() => GraphQLUUID, { nullable: true, description: 'The public ID of the channel definition' })
  @IsOptional()
  @Matches(IMPORT_PUBLIC_ID_PATTERN, { message: 'publicId must be a UUID' })
  public publicId?: string;

  @Field({ description: 'The name of the channel definition' })
  @IsString()
  @Length(1, 255)
  public name: string;

  @Field(() => Int, { description: 'The order of the channel definition' })
  @IsInt()
  @Min(0)
  public order: number;

  @Field(() => FixtureChannelPreset, { description: 'The preset of the channel definition' })
  @IsEnum(FixtureChannelPreset)
  public preset: FixtureChannelPreset;

  @Field(() => [ImportFixtureRangeInput], { description: 'The channel ranges of the channel definition' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportFixtureRangeInput)
  public ranges: ImportFixtureRangeInput[];
}

@InputType()
export class ImportFixtureAssignmentInput {
  @Field(() => Int, { description: 'The 1-based DMX channel number of the assignment' })
  @IsInt()
  @Min(1)
  public channelNumber: number;

  @Field(() => GraphQLUUID, {
    nullable: true,
    description: 'The public ID of the assigned channel definition in this fixture',
  })
  @IsOptional()
  @Matches(IMPORT_PUBLIC_ID_PATTERN, { message: 'publicId must be a UUID' })
  public channelDefinitionPublicId?: string;

  @Field({
    nullable: true,
    description: 'The name of the assigned channel definition when publicId is omitted',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  public channelDefinitionName?: string;
}

@InputType()
export class ImportFixtureModeInput {
  @Field(() => GraphQLUUID, { nullable: true, description: 'The public ID of the channel mode' })
  @IsOptional()
  @Matches(IMPORT_PUBLIC_ID_PATTERN, { message: 'publicId must be a UUID' })
  public publicId?: string;

  @Field({ description: 'The name of the channel mode' })
  @IsString()
  @Length(1, 255)
  public name: string;

  @Field(() => Int, { description: 'The order of the channel mode' })
  @IsInt()
  @Min(0)
  public order: number;

  @Field(() => [ImportFixtureAssignmentInput], { description: 'The channel assignments of the channel mode' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportFixtureAssignmentInput)
  public assignments: ImportFixtureAssignmentInput[];
}

@InputType()
export class ImportFixtureInput {
  @Field(() => GraphQLUUID, { nullable: true, description: 'The public ID of the fixture' })
  @IsOptional()
  @Matches(IMPORT_PUBLIC_ID_PATTERN, { message: 'publicId must be a UUID' })
  public publicId?: string;

  @Field({ description: 'The name of the fixture' })
  @IsString()
  @Length(1, 255)
  public name: string;

  @Field(() => ImportFixtureVendorInput, { description: 'The vendor of the fixture' })
  @ValidateNested()
  @Type(() => ImportFixtureVendorInput)
  public vendor: ImportFixtureVendorInput;

  @Field(() => [ImportFixtureDefinitionInput], { description: 'The channel definitions of the fixture' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportFixtureDefinitionInput)
  public channelDefinitions: ImportFixtureDefinitionInput[];

  @Field(() => [ImportFixtureModeInput], { description: 'The channel modes of the fixture' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportFixtureModeInput)
  public channelModes: ImportFixtureModeInput[];
}

@InputType()
export class ImportFixturesInput {
  @Field(() => Int, { description: 'The fixture export document schema version' })
  @IsInt()
  public schemaVersion: number;

  @Field(() => [ImportFixtureVendorInput], {
    nullable: true,
    description: 'Fixture vendors to upsert, including those without fixtures',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportFixtureVendorInput)
  public vendors?: ImportFixtureVendorInput[];

  @Field(() => [ImportFixtureInput], { description: 'The fixtures to import' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportFixtureInput)
  public fixtures: ImportFixtureInput[];
}

@ObjectType()
export class ImportFixturesPayload {
  @Field(() => Int, { description: 'The number of fixtures upserted from the document' })
  public importedCount: number;

  @Field(() => [FixtureDto], { description: 'The imported fixtures with related entities' })
  @Type(() => FixtureDto)
  public fixtures: FixtureDto[];
}
