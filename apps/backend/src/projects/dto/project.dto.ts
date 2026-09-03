import { BaseDto } from '@/db/base.dto';
import { ProjectFixtureDto } from '@/projects/dto/project-fixture.dto';
import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';

@ObjectType()
export class ProjectDto extends BaseDto {
  @Field({ description: 'The name of the project' })
  public name: string;

  @Field(() => Float, { description: 'Room width in meters' })
  public roomWidth: number;

  @Field(() => Float, { description: 'Room length in meters' })
  public roomLength: number;

  @Field(() => Float, { description: 'Room height in meters' })
  public roomHeight: number;

  @Field(() => [ProjectFixtureDto], {
    description: 'The fixture instances patched into this project',
    defaultValue: [],
  })
  @Type(() => ProjectFixtureDto)
  public projectFixtures: ProjectFixtureDto[];
}
