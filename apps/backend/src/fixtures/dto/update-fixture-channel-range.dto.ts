import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

@InputType()
export class UpdateFixtureChannelRangeInput {
  @Field(() => Int, { description: 'The DMX start channel of the range' })
  @IsInt()
  @Min(0)
  @Max(255)
  public dmxStart: number;

  @Field(() => Int, { description: 'The DMX end channel of the range' })
  @IsInt()
  @Min(0)
  @Max(255)
  public dmxEnd: number;

  @Field({ description: 'The description of the range' })
  @IsString()
  @Length(1, 1024)
  public description: string;
}
