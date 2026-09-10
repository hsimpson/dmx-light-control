import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLUUID } from 'graphql-scalars';

@ObjectType()
export class DeleteProject3dObjectPayload {
  @Field(() => GraphQLUUID, {
    description: 'The public id of the project 3D object that was requested for deletion',
  })
  public publicId: string;

  @Field({
    description: 'True if a project 3D object was deleted, false if no instance matched the public id',
  })
  public deleted: boolean;
}
