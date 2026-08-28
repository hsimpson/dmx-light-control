import { ExportTimestampsDto } from '@/db/export-timestamps.dto';
import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { GraphQLUUID } from 'graphql-scalars';

@ObjectType()
export class FixtureExportRangeDto extends ExportTimestampsDto {
  @Field(() => GraphQLUUID, { description: 'The public ID of the channel range' })
  public publicId: string;

  @Field(() => Int, { description: 'The DMX start value of the channel range' })
  public dmxStart: number;

  @Field(() => Int, { description: 'The DMX end value of the channel range' })
  public dmxEnd: number;

  @Field({ description: 'The description of the channel range' })
  public description: string;
}

@ObjectType()
export class FixtureExportDefinitionDto extends ExportTimestampsDto {
  @Field(() => GraphQLUUID, { description: 'The public ID of the channel definition' })
  public publicId: string;

  @Field({ description: 'The name of the channel definition' })
  public name: string;

  @Field(() => Int, { description: 'The order of the channel definition' })
  public order: number;

  @Field(() => FixtureChannelPreset, { description: 'The preset of the channel definition' })
  public preset: FixtureChannelPreset;

  @Field(() => [FixtureExportRangeDto], { description: 'The channel ranges of the channel definition' })
  @Type(() => FixtureExportRangeDto)
  public ranges: FixtureExportRangeDto[];
}

@ObjectType()
export class FixtureExportAssignmentDto extends ExportTimestampsDto {
  @Field(() => Int, { description: 'The 1-based DMX channel number of the assignment' })
  public channelNumber: number;

  @Field(() => GraphQLUUID, { description: 'The public ID of the assigned channel definition' })
  public channelDefinitionPublicId: string;
}

@ObjectType()
export class FixtureExportModeDto extends ExportTimestampsDto {
  @Field(() => GraphQLUUID, { description: 'The public ID of the channel mode' })
  public publicId: string;

  @Field({ description: 'The name of the channel mode' })
  public name: string;

  @Field(() => Int, { description: 'The order of the channel mode' })
  public order: number;

  @Field(() => [FixtureExportAssignmentDto], { description: 'The channel assignments of the channel mode' })
  @Type(() => FixtureExportAssignmentDto)
  public assignments: FixtureExportAssignmentDto[];
}

@ObjectType()
export class FixtureExportVendorDto extends ExportTimestampsDto {
  @Field(() => GraphQLUUID, { description: 'The public ID of the vendor' })
  public publicId: string;

  @Field({ description: 'The name of the vendor' })
  public name: string;
}

@ObjectType()
export class FixtureExportFixtureDto extends ExportTimestampsDto {
  @Field(() => GraphQLUUID, { description: 'The public ID of the fixture' })
  public publicId: string;

  @Field({ description: 'The name of the fixture' })
  public name: string;

  @Field(() => FixtureExportVendorDto, { description: 'The vendor of the fixture' })
  @Type(() => FixtureExportVendorDto)
  public vendor: FixtureExportVendorDto;

  @Field(() => [FixtureExportDefinitionDto], { description: 'The channel definitions of the fixture' })
  @Type(() => FixtureExportDefinitionDto)
  public channelDefinitions: FixtureExportDefinitionDto[];

  @Field(() => [FixtureExportModeDto], { description: 'The channel modes of the fixture' })
  @Type(() => FixtureExportModeDto)
  public channelModes: FixtureExportModeDto[];
}

@ObjectType()
export class FixtureExportDocumentDto {
  @Field(() => Int, { description: 'The fixture export document schema version' })
  public schemaVersion: number;

  @Field(() => [FixtureExportVendorDto], { description: 'All fixture vendors, including those without fixtures' })
  @Type(() => FixtureExportVendorDto)
  public vendors: FixtureExportVendorDto[];

  @Field(() => [FixtureExportFixtureDto], { description: 'The fixtures included in the export' })
  @Type(() => FixtureExportFixtureDto)
  public fixtures: FixtureExportFixtureDto[];
}
