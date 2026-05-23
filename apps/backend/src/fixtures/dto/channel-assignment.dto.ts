import { BaseDto } from '@/db/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';
import { FixtureChannelPreset } from '../channel-presets';

@ObjectType()
export class ChannelAssignmentDto extends BaseDto {
  @Field({ description: 'The channel mode of the channel assignment' })
  public channelMode: number;

  @Field({ description: 'The number of the channel assignment' })
  public channelNumber: number;

  @Field(() => FixtureChannelPreset, {
    description: 'The preset of the channel assignment',
  })
  public preset: FixtureChannelPreset;
}
