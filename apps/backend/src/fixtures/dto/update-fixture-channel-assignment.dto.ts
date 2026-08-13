import { Field, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

@InputType()
export class UpdateFixtureChannelAssignmentInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the channel definition to assign' })
  @IsUUID('4')
  public channelDefinitionPublicId: string;
}
