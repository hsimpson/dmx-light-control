import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ isAbstract: true })
export abstract class ExportTimestampsDto {
  @Field({ description: 'The date and time when the entity was created' })
  public createdAt: Date;

  @Field({ description: 'The date and time when the entity was last updated' })
  public updatedAt: Date;
}
