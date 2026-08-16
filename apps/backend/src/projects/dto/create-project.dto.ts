import { Field, InputType } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';

@InputType()
export class CreateProjectInput {
  @Field({ description: 'The name of the project' })
  @IsString()
  @Length(1, 255)
  public name: string;
}
