import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLUUID } from 'graphql-scalars';

@ObjectType()
export class DeleteProjectPayload {
  @Field(() => GraphQLUUID, {
    description: 'The public id of the project that was requested for deletion',
  })
  public publicId: string;

  @Field({
    description: 'True if a project was deleted, false if no project matched the public id',
  })
  public deleted: boolean;
}
