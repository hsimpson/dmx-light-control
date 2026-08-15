import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsUUID, Length } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

@InputType()
export class UpdateFixtureChannelDefinitionInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the channel definition' })
  @IsUUID('4')
  public publicId: string;

  @Field({ description: 'The new name of the channel definition' })
  @IsString()
  @Length(1, 255)
  public name: string;
}
