import { BaseDto } from '@/db/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';
import { FixtureChannelPreset } from '../channel-presets';
import { FixtureChannelAssignmentDto } from './fixture-channel-assignment.dto';

@ObjectType()
export class FixtureChannelDefinitionDto extends BaseDto {
  @Field({ description: 'The name of the channel definition' })
  public name: string;

  @Field(() => FixtureChannelPreset, {
    description: 'The preset of the channel assignment',
  })
  public preset: FixtureChannelPreset;

  @Field(() => [FixtureChannelAssignmentDto], {
    description: 'The channel assignments of the channel mode',
  })
  public fixtureChannelAssignments: FixtureChannelAssignmentDto[];
}
