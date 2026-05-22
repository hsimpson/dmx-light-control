import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export abstract class BaseDto {
  @Field({ description: 'The unique identifier of the entity' })
  public externalId: string;

  @Field({ description: 'The date and time when the entity was created' })
  public createdAt: Date;

  @Field({ description: 'The date and time when the entity was last updated' })
  public updatedAt: Date;
}
