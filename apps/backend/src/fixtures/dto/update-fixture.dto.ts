import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

@InputType()
export class UpdateFixtureInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the fixture' })
  @IsUUID('4')
  public publicId: string;

  @Field({ nullable: true, description: 'The name of the fixture' })
  @IsOptional()
  @IsString()
  public name?: string;

  @Field(() => GraphQLUUID, { description: 'The public ID of the vendor', nullable: true })
  @IsOptional()
  @IsUUID('4')
  public vendorPublicId?: string;

  @Field({ nullable: true, description: 'The name of the vendor' })
  @IsOptional()
  @IsString()
  public vendorName?: string;
}
