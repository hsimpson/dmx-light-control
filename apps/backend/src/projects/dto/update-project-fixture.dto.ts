import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

@InputType()
export class UpdateProjectFixtureInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project fixture instance' })
  @IsUUID('4')
  public publicId: string;

  @Field(() => GraphQLUUID, {
    nullable: true,
    description: 'The public ID of the channel mode',
  })
  @IsOptional()
  @IsUUID('4')
  public channelModePublicId?: string;

  @Field(() => Int, {
    nullable: true,
    description: 'The DMX start address (1–512)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(512)
  public startAddress?: number;
}
