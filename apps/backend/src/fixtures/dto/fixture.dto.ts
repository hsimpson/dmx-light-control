import { BaseDto } from '@/db/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { FixtureChannelDefinitionDto } from './fixture-channel-definition.dto';
import { FixtureChannelModeDto } from './fixture-channel-mode.dto';
import { FixtureVendorDto } from './fixture-vendor.dto';

@ObjectType()
export class FixtureDto extends BaseDto {
  @Field({ description: 'The name of the fixture' })
  public name: string;

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
