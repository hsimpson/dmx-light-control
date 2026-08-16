import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLUUID } from 'graphql-scalars';

@ObjectType()
export class DeleteFixturePayload {
  @Field(() => GraphQLUUID, {
    description: 'The public id of the fixture that was requested for deletion',
  })
  public publicId: string;

  @Field({
    description: 'True if a fixture was deleted, false if no fixture matched the public id',
  })
  public deleted: boolean;
}
