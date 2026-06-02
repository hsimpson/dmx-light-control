import { BaseDto } from '@/db/base.dto';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { FixtureChannelPreset } from '../channel-presets';

@ObjectType()
export class ChannelDto extends BaseDto {
  @Field(() => Int, { description: 'The number of the channel assignment' })
  public channelNumber: number;

  @Field(() => FixtureChannelPreset, {
    description: 'The preset of the channel assignment',
  })
  public preset: FixtureChannelPreset;
}

@ObjectType()
export class ChannelAssignmentDto {
  @Field(() => Int, {
    description: 'The channel mode of the channel assignment',
  })
  public channelMode: number;

  @Type(() => ChannelDto)
  @Field(() => [ChannelDto], {
    description: 'The channels of the channel assignment',
  })
  public channels: ChannelDto[];
}
