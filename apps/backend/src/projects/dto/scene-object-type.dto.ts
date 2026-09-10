import { BaseDto } from '@/db/base.dto';
import { SceneObjectGeometryKind } from '@/projects/scene-object-geometry';
import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SceneObjectTypeDto extends BaseDto {
  @Field({ description: 'The display name of the scene object type' })
  public name: string;

  @Field(() => SceneObjectGeometryKind, { description: 'How this type is rendered in the 3D view' })
  public geometryKind: SceneObjectGeometryKind;

  @Field(() => String, { nullable: true, description: 'Static asset path for GLTF types, relative to the API origin' })
  public modelPath: string | null;

  @Field({ description: 'Whether instances of this type can be resized' })
  public isScalable: boolean;

  @Field(() => Float, { description: 'Default width in meters when adding a scalable instance' })
  public defaultSizeX: number;

  @Field(() => Float, { description: 'Default height in meters when adding a scalable instance' })
  public defaultSizeY: number;

  @Field(() => Float, { description: 'Default length in meters when adding a scalable instance' })
  public defaultSizeZ: number;
}
