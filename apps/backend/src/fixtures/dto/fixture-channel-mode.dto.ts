import { BaseDto } from '@/db/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';
import { FixtureChannelAssignmentDto } from './fixture-channel-assignment.dto';

@ObjectType()
export class FixtureChannelModeDto extends BaseDto {
  @Field({ description: 'The name of the channel mode' })
  public name: string;

  @Field(() => [FixtureChannelAssignmentDto], {
    description: 'The channel assignments of the channel mode',
  })
  public fixtureChannelAssignments: FixtureChannelAssignmentDto[];
}
