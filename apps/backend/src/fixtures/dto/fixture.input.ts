import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

@InputType()
export class FixtureVendorInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the vendor (used for updates)', nullable: true })
  @IsOptional()
  public publicId?: string;

  @Field({ nullable: true, description: 'The name of the vendor' })
  @IsOptional()
  @IsString()
  public name?: string;
}
