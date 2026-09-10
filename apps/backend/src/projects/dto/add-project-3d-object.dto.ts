import { ROOM_DIMENSION_MAX, ROOM_DIMENSION_MIN } from '@/projects/project-room-dimensions';
import { Field, Float, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

@InputType()
export class AddProject3dObjectInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project' })
  @IsUUID('4')
  public projectPublicId: string;

  @Field(() => GraphQLUUID, { description: 'The public ID of the scene object type' })
  @IsUUID('4')
  public sceneObjectTypePublicId: string;

  @Field({ nullable: true, description: 'Unique name within the project. Defaults to "{type} {n}".' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  public name?: string;

  @Field(() => Float, { nullable: true, description: 'Width in meters for scalable objects' })
  @IsOptional()
  @IsNumber()
  @Min(ROOM_DIMENSION_MIN)
  @Max(ROOM_DIMENSION_MAX)
  public sizeX?: number;

  @Field(() => Float, { nullable: true, description: 'Height in meters for scalable objects' })
  @IsOptional()
  @IsNumber()
  @Min(ROOM_DIMENSION_MIN)
  @Max(ROOM_DIMENSION_MAX)
  public sizeY?: number;

  @Field(() => Float, { nullable: true, description: 'Length in meters for scalable objects' })
  @IsOptional()
  @IsNumber()
  @Min(ROOM_DIMENSION_MIN)
  @Max(ROOM_DIMENSION_MAX)
  public sizeZ?: number;

  @Field(() => [Float], {
    nullable: true,
    description: 'Column-major 4×4 transform (16 values). Defaults to sitting on the floor.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(16)
  @ArrayMaxSize(16)
  @IsNumber({}, { each: true })
  public transform?: number[];
}
