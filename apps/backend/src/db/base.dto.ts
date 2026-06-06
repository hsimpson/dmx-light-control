import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLUUID } from 'graphql-scalars';

@ObjectType()
export abstract class BaseDto {
  @Field(() => GraphQLUUID, {
    description: 'The public id, unique identifier of the entity',
  })
  public publicId: string;

  @Field({ description: 'The date and time when the entity was created' })
  public createdAt: Date;

  @Field({ description: 'The date and time when the entity was last updated' })
  public updatedAt: Date;
}
