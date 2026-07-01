import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';
import { FixtureVendorInput } from './fixture.input';

@InputType()
export class UpdateFixtureInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the fixture' })
  @IsUUID('4')
  public publicId: string;

  @Field({ nullable: true, description: 'The name of the fixture' })
  @IsOptional()
  @IsString()
  public name?: string;

  @Field(() => FixtureVendorInput, { nullable: true, description: 'The vendor of the fixture' })
  @IsOptional()
  public vendor?: FixtureVendorInput;
}
