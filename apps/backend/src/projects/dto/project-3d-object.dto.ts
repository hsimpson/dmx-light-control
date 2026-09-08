import { BaseDto } from '@/db/base.dto';
import { SceneObjectTypeDto } from '@/projects/dto/scene-object-type.dto';
import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';

@ObjectType()
export class Project3dObjectDto extends BaseDto {
  @Field({ description: 'The unique name of this instance within the project' })
  public name: string;

  @Field(() => Float, { nullable: true, description: 'Width in meters for scalable objects' })
  public sizeX: number | null;

  @Field(() => Float, { nullable: true, description: 'Height in meters for scalable objects' })
  public sizeY: number | null;

  @Field(() => Float, { nullable: true, description: 'Length in meters for scalable objects' })
  public sizeZ: number | null;

  @Field(() => [Float], { description: 'Column-major 4×4 transform (16 values, translation and rotation only)' })
  public transform: number[];

  @Type(() => SceneObjectTypeDto)
  @Field(() => SceneObjectTypeDto, { description: 'The catalog type of this instance' })
  public sceneObjectType: SceneObjectTypeDto;
}
