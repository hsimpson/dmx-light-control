import { BaseDto } from '@/db/base.dto';
import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { FixtureVendorDto } from '@/fixtures/dto/fixture-vendor.dto';
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { GraphQLUUID } from 'graphql-scalars';

@ObjectType()
export class ProjectFixtureChannelRangeDto {
  @Field(() => Int, { description: 'The DMX start value of the channel range' })
  public dmxStart: number;

  @Field(() => Int, { description: 'The DMX end value of the channel range' })
  public dmxEnd: number;

  @Field({ description: 'The description of the channel range' })
  public description: string;
}

@ObjectType()
export class ProjectFixtureChannelDefinitionDto {
  @Field({ description: 'The name of the channel definition' })
  public name: string;

  @Field(() => FixtureChannelPreset, { description: 'The preset of the channel definition' })
  public preset: FixtureChannelPreset;

  @Type(() => ProjectFixtureChannelRangeDto)
  @Field(() => [ProjectFixtureChannelRangeDto], { description: 'The DMX value ranges of the channel definition' })
  public fixtureChannelRanges: ProjectFixtureChannelRangeDto[];
}

@ObjectType()
export class ProjectFixtureChannelAssignmentDto {
  @Field(() => GraphQLUUID, { description: 'The public ID of the channel assignment' })
  public publicId: string;

  @Field(() => Int, { description: 'The 1-based DMX channel number of the assignment' })
  public channelNumber: number;

  @Type(() => ProjectFixtureChannelDefinitionDto)
  @Field(() => ProjectFixtureChannelDefinitionDto, {
    description: 'The channel definition assigned to this channel number',
  })
  public fixtureChannelDefinition: ProjectFixtureChannelDefinitionDto;
}

@ObjectType()
export class ProjectFixtureFixtureDto extends BaseDto {
  @Field({ description: 'The name of the fixture' })
  public name: string;

  @Field(() => String, { nullable: true, description: '3D model path relative to the API origin' })
  public model3dPath?: string | null;

  @Type(() => FixtureVendorDto)
  @Field(() => FixtureVendorDto, { description: 'The vendor of the fixture' })
  public fixtureVendor: FixtureVendorDto;
}

@ObjectType()
export class ProjectFixtureChannelModeDto extends BaseDto {
  @Field({ description: 'The name of the channel mode' })
  public name: string;

  @Field(() => [ProjectFixtureChannelAssignmentDto], {
    description: 'The channel assignments of the channel mode',
  })
  @Type(() => ProjectFixtureChannelAssignmentDto)
  public fixtureChannelAssignments: ProjectFixtureChannelAssignmentDto[];
}

@ObjectType()
export class ProjectFixtureDto extends BaseDto {
  @Field(() => Int, { description: 'The DMX start address of the patched fixture instance' })
  public startAddress: number;

  @Field(() => [Float], { description: 'Column-major 4×4 transform (16 values, translation and rotation only)' })
  public transform: number[];

  @Type(() => ProjectFixtureFixtureDto)
  @Field(() => ProjectFixtureFixtureDto, { description: 'The catalog fixture type of this instance' })
  public fixture: ProjectFixtureFixtureDto;

  @Type(() => ProjectFixtureChannelModeDto)
  @Field(() => ProjectFixtureChannelModeDto, { description: 'The channel mode used for this instance' })
  public channelMode: ProjectFixtureChannelModeDto;
}
