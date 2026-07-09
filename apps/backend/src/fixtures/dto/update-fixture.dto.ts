import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';
import { UpdateFixtureVendorInput } from './fixture.input';

@InputType()
export class UpdateFixtureInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the fixture' })
  @IsUUID('4')
  public publicId: string;

  @Field({ nullable: true, description: 'The name of the fixture' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  public name?: string;

  @Field(() => UpdateFixtureVendorInput, { nullable: true, description: 'The vendor of the fixture' })
  @IsOptional()
  public vendor?: UpdateFixtureVendorInput;
}
