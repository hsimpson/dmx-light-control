import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

@InputType()
export class AddProjectFixtureInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project' })
  @IsUUID('4')
  public projectPublicId: string;

  @Field(() => GraphQLUUID, { description: 'The public ID of the catalog fixture' })
  @IsUUID('4')
  public fixturePublicId: string;

  @Field(() => GraphQLUUID, { description: 'The public ID of the channel mode' })
  @IsUUID('4')
  public channelModePublicId: string;

  @Field(() => Int, { description: 'The DMX start address (1–512)' })
  @IsInt()
  @Min(1)
  @Max(512)
  public startAddress: number;
}
