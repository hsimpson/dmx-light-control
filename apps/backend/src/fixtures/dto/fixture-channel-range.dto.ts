import { BaseDto } from '@/db/base.dto';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FixtureChannelRangeDto extends BaseDto {
  @Field(() => Int, { description: 'The DMX start channel of the channel range' })
  public dmxStart: number;

  @Field(() => Int, { description: 'The DMX end channel of the channel range' })
  public dmxEnd: number;

  @Field({ description: 'The description of the channel range' })
  public description: string;
}
