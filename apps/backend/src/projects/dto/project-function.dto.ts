import { BaseDto } from '@/db/base.dto';
import { ProjectFunctionType, SequenceDirection, SequenceRunOrder } from '@/projects/project-function';
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

@ObjectType()
export class SequenceStepDmxValueDto {
  @Field(() => Int, { description: 'DMX channel from 1 to 512' })
  public channel: number;

  @Field(() => Int, { description: 'DMX value from 0 to 255' })
  public value: number;
}

@InputType()
export class SequenceStepDmxValueInput {
  @Field(() => Int, { description: 'DMX channel from 1 to 512' })
  @IsInt()
  @Min(1)
  @Max(512)
  public channel: number;

  @Field(() => Int, { description: 'DMX value from 0 to 255' })
  @IsInt()
  @Min(0)
  @Max(255)
  public value: number;
}

@ObjectType()
export class SequenceStepDto {
  @Field(() => Int, { description: 'Fade-in time in milliseconds' })
  public fadeIn: number;

  @Field(() => Int, { description: 'Hold time in milliseconds' })
  public hold: number;

  @Field(() => Int, { description: 'Fade-out time in milliseconds. 0 skips the fade-out.' })
  public fadeOut: number;

  @Field(() => [SequenceStepDmxValueDto], { description: 'Sparse DMX values for this step' })
  @Type(() => SequenceStepDmxValueDto)
  public dmxValues: SequenceStepDmxValueDto[];
}

@InputType()
export class SequenceStepInput {
  @Field(() => Int, { description: 'Fade-in time in milliseconds' })
  @IsInt()
  @Min(0)
  public fadeIn: number;

  @Field(() => Int, { description: 'Hold time in milliseconds' })
  @IsInt()
  @Min(0)
  public hold: number;

  @Field(() => Int, { description: 'Fade-out time in milliseconds. 0 skips the fade-out.' })
  @IsInt()
  @Min(0)
  public fadeOut: number;

  @Field(() => [SequenceStepDmxValueInput], { description: 'Sparse DMX values for this step' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SequenceStepDmxValueInput)
  public dmxValues: SequenceStepDmxValueInput[];
}

@ObjectType()
export class SequencePropertiesDto {
  @Field(() => SequenceDirection, { description: 'Direction the sequence walks its steps' })
  public direction: SequenceDirection;

  @Field(() => SequenceRunOrder, { description: 'How the sequence repeats' })
  public runOrder: SequenceRunOrder;

  @Field(() => [SequenceStepDto], { description: 'Steps in order' })
  @Type(() => SequenceStepDto)
  public steps: SequenceStepDto[];
}

@InputType()
export class SequencePropertiesInput {
  @Field(() => SequenceDirection, { description: 'Direction the sequence walks its steps' })
  @IsEnum(SequenceDirection)
  public direction: SequenceDirection;

  @Field(() => SequenceRunOrder, { description: 'How the sequence repeats' })
  @IsEnum(SequenceRunOrder)
  public runOrder: SequenceRunOrder;

  @Field(() => [SequenceStepInput], { description: 'Steps in order' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SequenceStepInput)
  public steps: SequenceStepInput[];
}

@ObjectType()
export class ProjectFunctionDto extends BaseDto {
  @Field({ description: 'The unique name of this function within the project' })
  public name: string;

  @Field(() => ProjectFunctionType, { description: 'The function type' })
  public type: ProjectFunctionType;

  @Field(() => SequencePropertiesDto, {
    nullable: true,
    description: 'Sequence properties when type is Sequence',
  })
  @Type(() => SequencePropertiesDto)
  public sequence: SequencePropertiesDto | null;
}

@InputType()
export class AddProjectFunctionInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project' })
  @IsUUID('4')
  public projectPublicId: string;

  @Field({ description: 'Unique name within the project' })
  @IsString()
  @Length(1, 255)
  public name: string;

  @Field(() => ProjectFunctionType, { description: 'The function type' })
  @IsEnum(ProjectFunctionType)
  public type: ProjectFunctionType;

  @Field(() => SequencePropertiesInput, {
    nullable: true,
    description: 'Sequence properties, required when type is Sequence',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SequencePropertiesInput)
  public sequence?: SequencePropertiesInput;
}

@InputType()
export class UpdateProjectFunctionInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the function' })
  @IsUUID('4')
  public publicId: string;

  @Field({ nullable: true, description: 'Unique name within the project' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  public name?: string;

  @Field(() => SequencePropertiesInput, {
    nullable: true,
    description: 'Replacement sequence properties. Replaces the whole sequence, including steps.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SequencePropertiesInput)
  public sequence?: SequencePropertiesInput;
}
