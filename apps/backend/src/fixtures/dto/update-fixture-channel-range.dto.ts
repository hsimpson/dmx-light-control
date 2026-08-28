import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

@InputType()
export class UpdateFixtureChannelRangeInput {
  @Field(() => GraphQLUUID, {
    nullable: true,
    description: 'The public ID of the channel range. Omit to create a new range.',
  })
  @IsOptional()
  @IsUUID('4')
  public publicId?: string;

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
