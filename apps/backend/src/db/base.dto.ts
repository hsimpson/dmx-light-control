import { Field, ObjectType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';

@ObjectType()
export abstract class BaseDto {
  @Expose()
  @Field({ description: 'The unique identifier of the entity' })
  public externalId: string;

  @Expose()
  @Field({ description: 'The date and time when the entity was created' })
  public createdAt: Date;

  @Expose()
  @Field({ description: 'The date and time when the entity was last updated' })
  public updatedAt: Date;
}
