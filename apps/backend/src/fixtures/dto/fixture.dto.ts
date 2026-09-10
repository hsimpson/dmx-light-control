import { BaseDto } from '@/db/base.dto';
import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { FixtureChannelDefinitionDto } from './fixture-channel-definition.dto';
import { FixtureChannelModeDto } from './fixture-channel-mode.dto';
import { FixtureVendorDto } from './fixture-vendor.dto';

@ObjectType()
export class FixtureDto extends BaseDto {
  @Field({ description: 'The name of the fixture' })
  public name: string;

  @Field(() => Float, { nullable: true, description: 'Fixture weight in kilograms' })
  public weight?: number | null;

  @Field(() => Float, { nullable: true, description: 'Fixture width in meters' })
  public width?: number | null;

  @Field(() => Float, { nullable: true, description: 'Fixture length in meters' })
  public length?: number | null;

  @Field(() => Float, { nullable: true, description: 'Fixture height in meters' })
  public height?: number | null;

  @Field(() => String, { nullable: true, description: 'Product photo path relative to the API origin' })
  public picturePath?: string | null;

  @Field(() => String, { nullable: true, description: '2D plot symbol path relative to the API origin' })
  public picture2dPath?: string | null;

  @Field(() => String, { nullable: true, description: '3D model path relative to the API origin' })
  public model3dPath?: string | null;

  @Type(() => FixtureVendorDto)
  @Field(() => FixtureVendorDto, { description: 'The vendor of the fixture' })
  public fixtureVendor: FixtureVendorDto;

  @Field(() => [FixtureChannelDefinitionDto], { description: 'The channel definitions of the fixture' })
  @Type(() => FixtureChannelDefinitionDto)
  public fixtureChannelDefinitions: FixtureChannelDefinitionDto[];

  @Field(() => [FixtureChannelModeDto], { description: 'The channel modes of the fixture' })
  @Type(() => FixtureChannelModeDto)
  public fixtureChannelModes: FixtureChannelModeDto[];
}
