import { BaseDto } from '@/db/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProjectDto extends BaseDto {
  @Field({ description: 'The name of the project' })
  public name: string;
}
