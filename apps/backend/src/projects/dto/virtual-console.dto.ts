import {
  VIRTUAL_CONSOLE_CONTROL_SIZE_MIN,
  VIRTUAL_CONSOLE_SIZE_MAX,
  VIRTUAL_CONSOLE_SIZE_MIN,
  VirtualConsoleControlTypeEnum,
  VirtualConsoleSliderOrientation,
  VirtualConsoleSliderValueType,
} from '@/projects/virtual-console';
import { Field, Float, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

@ObjectType()
export class VirtualConsoleControlDto {
  @Field(() => GraphQLUUID, { description: 'Stable id of this control' })
  public id: string;

  @Field(() => VirtualConsoleControlTypeEnum, { description: 'Control kind' })
  public type: VirtualConsoleControlTypeEnum;

  @Field(() => Float, { description: 'X position relative to the parent' })
  public x: number;

  @Field(() => Float, { description: 'Y position relative to the parent' })
  public y: number;

  @Field(() => Float, { description: 'Width in pixels' })
  public width: number;

  @Field(() => Float, { description: 'Height in pixels' })
  public height: number;

  @Field({ description: 'Display label' })
  public label: string;

  @Field({ description: 'Background color as hex' })
  public backgroundColor: string;

  @Field(() => Float, { nullable: true, description: 'Frame border width in pixels' })
  public borderWidth?: number;

  @Field({ nullable: true, description: 'Frame border color as hex' })
  public borderColor?: string;

  @Field(() => [VirtualConsoleControlDto], { nullable: true, description: 'Nested controls when this is a frame' })
  @Type(() => VirtualConsoleControlDto)
  public children?: VirtualConsoleControlDto[];

  @Field(() => VirtualConsoleSliderOrientation, { nullable: true, description: 'Slider orientation' })
  public orientation?: VirtualConsoleSliderOrientation;

  @Field({ nullable: true, description: 'Foreground color as hex' })
  public foregroundColor?: string;

  @Field(() => VirtualConsoleSliderValueType, { nullable: true, description: 'Slider value interpretation' })
  public valueType?: VirtualConsoleSliderValueType;
}

@ObjectType()
export class VirtualConsolePageDto {
  @Field(() => GraphQLUUID, { description: 'Stable id of this page' })
  public id: string;

  @Field({ description: 'Page tab label' })
  public name: string;

  @Field(() => [VirtualConsoleControlDto], { description: 'Top-level controls on this page' })
  @Type(() => VirtualConsoleControlDto)
  public controls: VirtualConsoleControlDto[];
}

@ObjectType()
export class VirtualConsoleDto {
  @Field(() => Int, { description: 'Virtual console document schema version' })
  public schemaVersion: number;

  @Field(() => Float, { description: 'Canvas width in pixels' })
  public width: number;

  @Field(() => Float, { description: 'Canvas height in pixels' })
  public height: number;

  @Field(() => [VirtualConsolePageDto], { description: 'Console pages' })
  @Type(() => VirtualConsolePageDto)
  public pages: VirtualConsolePageDto[];
}

@InputType()
export class VirtualConsoleControlInput {
  @Field(() => GraphQLUUID, { description: 'Stable id of this control' })
  @Matches(UUID_PATTERN, { message: 'id must be a UUID' })
  public id: string;

  @Field(() => VirtualConsoleControlTypeEnum, { description: 'Control kind' })
  @IsEnum(VirtualConsoleControlTypeEnum)
  public type: VirtualConsoleControlTypeEnum;

  @Field(() => Float, { description: 'X position relative to the parent' })
  @IsNumber()
  public x: number;

  @Field(() => Float, { description: 'Y position relative to the parent' })
  @IsNumber()
  public y: number;

  @Field(() => Float, { description: 'Width in pixels' })
  @IsNumber()
  @Min(VIRTUAL_CONSOLE_CONTROL_SIZE_MIN)
  @Max(VIRTUAL_CONSOLE_SIZE_MAX)
  public width: number;

  @Field(() => Float, { description: 'Height in pixels' })
  @IsNumber()
  @Min(VIRTUAL_CONSOLE_CONTROL_SIZE_MIN)
  @Max(VIRTUAL_CONSOLE_SIZE_MAX)
  public height: number;

  @Field({ description: 'Display label' })
  @IsString()
  @Length(0, 255)
  public label: string;

  @Field({ description: 'Background color as hex' })
  @Matches(COLOR_PATTERN)
  public backgroundColor: string;

  @Field(() => Float, { nullable: true, description: 'Frame border width in pixels' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(32)
  public borderWidth?: number;

  @Field({ nullable: true, description: 'Frame border color as hex' })
  @IsOptional()
  @Matches(COLOR_PATTERN)
  public borderColor?: string;

  @Field(() => [VirtualConsoleControlInput], { nullable: true, description: 'Nested controls when this is a frame' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VirtualConsoleControlInput)
  public children?: VirtualConsoleControlInput[];

  @Field(() => VirtualConsoleSliderOrientation, { nullable: true, description: 'Slider orientation' })
  @IsOptional()
  @IsEnum(VirtualConsoleSliderOrientation)
  public orientation?: VirtualConsoleSliderOrientation;

  @Field({ nullable: true, description: 'Foreground color as hex' })
  @IsOptional()
  @Matches(COLOR_PATTERN)
  public foregroundColor?: string;

  @Field(() => VirtualConsoleSliderValueType, { nullable: true, description: 'Slider value interpretation' })
  @IsOptional()
  @IsEnum(VirtualConsoleSliderValueType)
  public valueType?: VirtualConsoleSliderValueType;
}

@InputType()
export class VirtualConsolePageInput {
  @Field(() => GraphQLUUID, { description: 'Stable id of this page' })
  @Matches(UUID_PATTERN, { message: 'id must be a UUID' })
  public id: string;

  @Field({ description: 'Page tab label' })
  @IsString()
  @Length(1, 255)
  public name: string;

  @Field(() => [VirtualConsoleControlInput], { description: 'Top-level controls on this page' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VirtualConsoleControlInput)
  public controls: VirtualConsoleControlInput[];
}

@InputType()
export class VirtualConsoleInput {
  @Field(() => Int, { description: 'Virtual console document schema version' })
  @IsInt()
  public schemaVersion: number;

  @Field(() => Float, { description: 'Canvas width in pixels' })
  @IsNumber()
  @Min(VIRTUAL_CONSOLE_SIZE_MIN)
  @Max(VIRTUAL_CONSOLE_SIZE_MAX)
  public width: number;

  @Field(() => Float, { description: 'Canvas height in pixels' })
  @IsNumber()
  @Min(VIRTUAL_CONSOLE_SIZE_MIN)
  @Max(VIRTUAL_CONSOLE_SIZE_MAX)
  public height: number;

  @Field(() => [VirtualConsolePageInput], { description: 'Console pages' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VirtualConsolePageInput)
  public pages: VirtualConsolePageInput[];
}

@InputType()
export class UpdateProjectVirtualConsoleInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project' })
  @Matches(UUID_PATTERN, { message: 'publicId must be a UUID' })
  public publicId: string;

  @Field(() => VirtualConsoleInput, { description: 'The virtual console document to persist' })
  @ValidateNested()
  @Type(() => VirtualConsoleInput)
  public virtualConsole: VirtualConsoleInput;
}
