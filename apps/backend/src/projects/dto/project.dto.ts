import { BaseDto } from '@/db/base.dto';
import { IoDeviceDto } from '@/io/devices/dto/io-device.dto';
import { Project3dObjectDto } from '@/projects/dto/project-3d-object.dto';
import { ProjectFunctionDto } from '@/projects/dto/project-function.dto';
import { ProjectFixtureDto } from '@/projects/dto/project-fixture.dto';
import { VirtualConsoleDto } from '@/projects/dto/virtual-console.dto';
import { ProjectEnvironmentType } from '@/projects/project-environment';
import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';

@ObjectType()
export class ProjectDto extends BaseDto {
  @Field({ description: 'The name of the project' })
  public name: string;

  @Field(() => ProjectEnvironmentType, { description: 'The 3D environment used by the project' })
  public environmentType: ProjectEnvironmentType;

  @Field(() => Float, { description: 'Room width in meters' })
  public roomWidth: number;

  @Field(() => Float, { description: 'Room length in meters' })
  public roomLength: number;

  @Field(() => Float, { description: 'Room height in meters' })
  public roomHeight: number;

  @Field(() => VirtualConsoleDto, { description: 'The virtual console layout for this project' })
  @Type(() => VirtualConsoleDto)
  public virtualConsole: VirtualConsoleDto;

  @Field(() => [IoDeviceDto], { description: 'The input/output devices used by this project' })
  @Type(() => IoDeviceDto)
  public ioDevices: IoDeviceDto[];

  @Field(() => [ProjectFixtureDto], {
    description: 'The fixture instances patched into this project',
    defaultValue: [],
  })
  @Type(() => ProjectFixtureDto)
  public projectFixtures: ProjectFixtureDto[];

  @Field(() => [Project3dObjectDto], {
    description: 'The 3D scene objects placed in this project',
    defaultValue: [],
  })
  @Type(() => Project3dObjectDto)
  public project3dObjects: Project3dObjectDto[];

  @Field(() => [ProjectFunctionDto], {
    description: 'The functions configured in this project',
    defaultValue: [],
  })
  @Type(() => ProjectFunctionDto)
  public projectFunctions: ProjectFunctionDto[];
}
