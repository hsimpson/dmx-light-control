import { ProjectEnvironmentType } from '@/projects/project-environment';
import { ROOM_DIMENSION_MAX, ROOM_DIMENSION_MIN } from '@/projects/project-room-dimensions';
import { Field, Float, InputType } from '@nestjs/graphql';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

@InputType()
export class UpdateProjectInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project' })
  @IsUUID('4')
  public publicId: string;

  @Field({ description: 'The name of the project' })
  @IsString()
  @Length(1, 255)
  public name: string;

  @Field(() => ProjectEnvironmentType, { nullable: true, description: 'The 3D environment used by the project' })
  @IsOptional()
  @IsEnum(ProjectEnvironmentType)
  public environmentType?: ProjectEnvironmentType;

  @Field(() => Float, { nullable: true, description: 'Room width in meters' })
  @IsOptional()
  @IsNumber()
  @Min(ROOM_DIMENSION_MIN)
  @Max(ROOM_DIMENSION_MAX)
  public roomWidth?: number;

  @Field(() => Float, { nullable: true, description: 'Room length in meters' })
  @IsOptional()
  @IsNumber()
  @Min(ROOM_DIMENSION_MIN)
  @Max(ROOM_DIMENSION_MAX)
  public roomLength?: number;

  @Field(() => Float, { nullable: true, description: 'Room height in meters' })
  @IsOptional()
  @IsNumber()
  @Min(ROOM_DIMENSION_MIN)
  @Max(ROOM_DIMENSION_MAX)
  public roomHeight?: number;
}
