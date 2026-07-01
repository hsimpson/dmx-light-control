import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

@InputType()
export class FixtureVendorInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the vendor (used for updates)', nullable: true })
  @IsOptional()
  public publicId?: string;

  @Field({ nullable: true, description: 'The name of the vendor' })
  @IsOptional()
  @IsString()
  public name?: string;
}

@InputType()
export class FixtureChannelRangeInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the channel range (used for updates)', nullable: true })
  @IsOptional()
  public publicId?: string;

  @Field(() => Int, { description: 'The DMX start value of the channel range (0-255)' })
  @IsInt()
  @Min(0)
  @Max(255)
  public dmxStart: number;

  @Field(() => Int, { description: 'The DMX end value of the channel range (0-255)' })
  @IsInt()
  @Min(0)
  @Max(255)
  public dmxEnd: number;

  @Field({ description: 'The description of the channel range' })
  @IsString()
  public description: string;
}

@InputType()
export class FixtureChannelDefinitionInput {
  @Field(() => GraphQLUUID, {
    description: 'The public ID of the channel definition (used for updates)',
    nullable: true,
  })
  @IsOptional()
  public publicId?: string;

  @Field({ description: 'The name of the channel definition' })
  @IsString()
  public name: string;

  @Field(() => Int, { description: 'The order of the channel definition' })
  @IsInt()
  public order: number;

  @Field(() => FixtureChannelPreset, { description: 'The preset of the channel definition' })
  @IsOptional()
  public preset?: FixtureChannelPreset;

  @Field(() => [FixtureChannelRangeInput], { description: 'The channel ranges of the channel definition' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FixtureChannelRangeInput)
  public fixtureChannelRanges?: FixtureChannelRangeInput[];
}

@InputType()
export class FixtureChannelAssignmentInput {
  @Field(() => GraphQLUUID, {
    description: 'The public ID of the channel assignment (used for updates)',
    nullable: true,
  })
  @IsOptional()
  public publicId?: string;

  @Field(() => Int, { description: 'The number of the channel assignment' })
  @IsInt()
  public channelNumber: number;
}

@InputType()
export class FixtureChannelModeInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the channel mode (used for updates)', nullable: true })
  @IsOptional()
  public publicId?: string;

  @Field({ description: 'The name of the channel mode' })
  @IsString()
  public name: string;

  @Field(() => Int, { description: 'The order of the channel mode' })
  @IsInt()
  public order: number;

  @Field(() => [FixtureChannelAssignmentInput], {
    description: 'The channel assignments of the channel mode',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FixtureChannelAssignmentInput)
  public fixtureChannelAssignments?: FixtureChannelAssignmentInput[];
}

@InputType()
export class FixtureInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the fixture (used for updates)', nullable: true })
  @IsOptional()
  public publicId?: string;

  @Field({ description: 'The name of the fixture' })
  @IsString()
  public name: string;

  @Field(() => Float, { description: 'The vendor ID of the fixture' })
  @IsInt()
  public vendorId: number;

  @Field(() => [FixtureChannelDefinitionInput], { description: 'The channel definitions of the fixture' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FixtureChannelDefinitionInput)
  public fixtureChannelDefinitions?: FixtureChannelDefinitionInput[];

  @Field(() => [FixtureChannelModeInput], { description: 'The channel modes of the fixture' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FixtureChannelModeInput)
  public fixtureChannelModes?: FixtureChannelModeInput[];
}
