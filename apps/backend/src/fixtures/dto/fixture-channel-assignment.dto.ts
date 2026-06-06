import { BaseDto } from '@/db/base.dto';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FixtureChannelAssignmentDto extends BaseDto {
  @Field(() => Int, { description: 'The number of the channel assignment' })
  public channelNumber: number;
}
