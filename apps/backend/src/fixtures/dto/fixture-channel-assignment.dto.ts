import { BaseDto } from '@/db/base.dto';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { FixtureChannelDefinitionDto } from './fixture-channel-definition.dto';

@ObjectType()
export class FixtureChannelAssignmentDto extends BaseDto {
  @Field(() => Int, { description: 'The number of the channel assignment' })
  public channelNumber: number;

  @Type(() => FixtureChannelDefinitionDto)
  @Field(() => FixtureChannelDefinitionDto, {
    description: 'The channel definition assigned to this channel number',
  })
  public fixtureChannelDefinition: FixtureChannelDefinitionDto;
}
