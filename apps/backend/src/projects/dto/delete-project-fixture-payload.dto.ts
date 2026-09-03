import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLUUID } from 'graphql-scalars';

@ObjectType()
export class DeleteProjectFixturePayload {
  @Field(() => GraphQLUUID, {
    description: 'The public id of the project fixture that was requested for deletion',
  })
  public publicId: string;

  @Field({
    description: 'True if a project fixture was deleted, false if no instance matched the public id',
  })
  public deleted: boolean;
}
