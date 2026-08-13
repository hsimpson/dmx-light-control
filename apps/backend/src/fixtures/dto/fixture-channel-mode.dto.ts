import { BaseDto } from '@/db/base.dto';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { FixtureChannelAssignmentDto } from './fixture-channel-assignment.dto';

@ObjectType()
export class FixtureChannelModeDto extends BaseDto {
  @Field({ description: 'The name of the channel mode' })
  public name: string;

  @Field(() => Int, { description: 'The order of the channel mode' })
  public order: number;

  @Field(() => [FixtureChannelAssignmentDto], {
    description: 'The channel assignments of the channel mode',
  })
  @Type(() => FixtureChannelAssignmentDto)
  public fixtureChannelAssignments: FixtureChannelAssignmentDto[];
}
