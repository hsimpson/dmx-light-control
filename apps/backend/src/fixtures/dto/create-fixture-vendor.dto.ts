import { Field, InputType } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';

@InputType()
export class CreateFixtureVendorInput {
  @Field({ description: 'The name of the fixture vendor' })
  @IsString()
  @Length(1, 255)
  public name: string;
}
