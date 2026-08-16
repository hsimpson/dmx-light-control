import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsUUID, Length } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

@InputType()
export class UpdateProjectInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project' })
  @IsUUID('4')
  public publicId: string;

  @Field({ description: 'The name of the project' })
  @IsString()
  @Length(1, 255)
  public name: string;
}
