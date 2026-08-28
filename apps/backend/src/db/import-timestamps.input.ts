import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType({ isAbstract: true })
export abstract class ImportTimestampsInput {
  @Field({ nullable: true, description: 'The date and time when the entity was created' })
  @IsOptional()
  public createdAt?: Date;

  @Field({ nullable: true, description: 'The date and time when the entity was last updated' })
  @IsOptional()
  public updatedAt?: Date;
}

export function optionalImportTimestamps(source: { createdAt?: Date; updatedAt?: Date }): {
  createdAt?: Date;
  updatedAt?: Date;
} {
  const timestamps: { createdAt?: Date; updatedAt?: Date } = {};
  if (source.createdAt !== undefined) {
    timestamps.createdAt = source.createdAt;
  }
  if (source.updatedAt !== undefined) {
    timestamps.updatedAt = source.updatedAt;
  }
  return timestamps;
}
