import { BaseDto } from '@/db/base.dto';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { FixtureChannelPreset } from '../channel-presets';
import { FixtureChannelAssignmentDto } from './fixture-channel-assignment.dto';
import { FixtureChannelRangeDto } from './fixture-channel-range.dto';

@ObjectType()
export class FixtureChannelDefinitionDto extends BaseDto {
  @Field({ description: 'The name of the channel definition' })
  public name: string;

  @Field(() => Int, { description: 'The order of the channel definition' })
  public order: number;

  @Field(() => FixtureChannelPreset, {
    description: 'The preset of the channel assignment',
  })
  public preset: FixtureChannelPreset;

  @Field(() => [FixtureChannelRangeDto], {
    description: 'The channel ranges of the channel definition',
  })
  public fixtureChannelRanges: FixtureChannelRangeDto[];

  @Field(() => [FixtureChannelAssignmentDto], {
    description: 'The channel assignments of the channel mode',
  })
  public fixtureChannelAssignments: FixtureChannelAssignmentDto[];
}
