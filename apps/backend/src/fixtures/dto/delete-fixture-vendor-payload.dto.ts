import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLUUID } from 'graphql-scalars';

@ObjectType()
export class DeleteFixtureVendorPayload {
  @Field(() => GraphQLUUID, {
    description: 'The public id of the vendor that was requested for deletion',
  })
  public publicId: string;

  @Field({
    description: 'True if a vendor was deleted, false if no vendor matched the public id',
  })
  public deleted: boolean;
}
