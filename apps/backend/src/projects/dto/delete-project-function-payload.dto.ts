import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLUUID } from 'graphql-scalars';

@ObjectType()
export class DeleteProjectFunctionPayload {
  @Field(() => GraphQLUUID, {
    description: 'The public id of the project function that was requested for deletion',
  })
  public publicId: string;

  @Field({
    description: 'True if a project function was deleted, false if no function matched the public id',
  })
  public deleted: boolean;
}
