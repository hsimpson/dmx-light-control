import { MidiFeedbackDto, MidiFeedbackInput } from '@/midi-mappings/dto/midi-mapping.dto';
import {
  VIRTUAL_CONSOLE_AUDIO_BANDS_MAX,
  VIRTUAL_CONSOLE_AUDIO_BANDS_MIN,
  VIRTUAL_CONSOLE_CONTROL_SIZE_MIN,
  VIRTUAL_CONSOLE_FONT_SIZE_MAX,
  VIRTUAL_CONSOLE_FONT_SIZE_MIN,
  VIRTUAL_CONSOLE_FONT_WEIGHT_MAX,
  VIRTUAL_CONSOLE_FONT_WEIGHT_MIN,
  VIRTUAL_CONSOLE_SIZE_MAX,
  VIRTUAL_CONSOLE_SIZE_MIN,
  VIRTUAL_CONSOLE_SNAP_MAX,
  VIRTUAL_CONSOLE_SNAP_MIN,
  VirtualConsoleAudioBarMode,
  VirtualConsoleButtonMode,
  VirtualConsoleControlTypeEnum,
  VirtualConsoleSliderOrientation,
  VirtualConsoleSliderValueType,
} from '@/projects/virtual-console';
import { Field, Float, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
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
export class VirtualConsoleChannelBindingDto {
  @Field(() => GraphQLUUID, { description: 'Public id of the patched project fixture' })
  public projectFixturePublicId: string;

  @Field(() => GraphQLUUID, { description: 'Public id of the channel assignment in the fixture mode' })
  public channelAssignmentPublicId: string;

  @Field(() => Int, {
    nullable: true,
    description: '1-based channel number within the fixture mode (export/import remapping hint)',
  })
  public channelNumber?: number;

  @Field(() => GraphQLUUID, {
    nullable: true,
    description: 'Catalog channel definition public id (export/import remapping hint)',
  })
  public channelDefinitionPublicId?: string;
}

@InputType()
export class VirtualConsoleChannelBindingInput {
  @Field(() => GraphQLUUID, { description: 'Public id of the patched project fixture' })
  @Matches(UUID_PATTERN, { message: 'projectFixturePublicId must be a UUID' })
  public projectFixturePublicId: string;

  @Field(() => GraphQLUUID, { description: 'Public id of the channel assignment in the fixture mode' })
  @Matches(UUID_PATTERN, { message: 'channelAssignmentPublicId must be a UUID' })
  public channelAssignmentPublicId: string;

  @Field(() => Int, {
    nullable: true,
    description: '1-based channel number within the fixture mode (export/import remapping hint)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  public channelNumber?: number;

  @Field(() => GraphQLUUID, {
    nullable: true,
    description: 'Catalog channel definition public id (export/import remapping hint)',
  })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'channelDefinitionPublicId must be a UUID' })
  public channelDefinitionPublicId?: string;
}

@ObjectType()
export class VirtualConsoleAudioBarDto {
  @Field(() => VirtualConsoleAudioBarMode, { description: 'What this bar drives' })
  public mode: VirtualConsoleAudioBarMode;

  @Field(() => Int, { description: 'Level in percent below which channels are 0 and a function stops' })
  public minThreshold: number;

  @Field(() => Int, { description: 'Level in percent above which channels are full and a function starts' })
  public maxThreshold: number;

  @Field(() => [VirtualConsoleChannelBindingDto], { nullable: true, description: 'Fixture channels this bar drives' })
  @Type(() => VirtualConsoleChannelBindingDto)
  public channelBindings?: VirtualConsoleChannelBindingDto[];

  @Field(() => GraphQLUUID, { nullable: true, description: 'Project function this bar starts and stops' })
  public functionPublicId?: string;

  @Field({ nullable: true, description: 'Function name used to remap the binding on import' })
  public functionName?: string;
}

@InputType()
export class VirtualConsoleAudioBarInput {
  @Field(() => VirtualConsoleAudioBarMode, { description: 'What this bar drives' })
  @IsEnum(VirtualConsoleAudioBarMode)
  public mode: VirtualConsoleAudioBarMode;

  @Field(() => Int, { description: 'Level in percent below which channels are 0 and a function stops' })
  @IsInt()
  @Min(0)
  @Max(100)
  public minThreshold: number;

  @Field(() => Int, { description: 'Level in percent above which channels are full and a function starts' })
  @IsInt()
  @Min(0)
  @Max(100)
  public maxThreshold: number;

  @Field(() => [VirtualConsoleChannelBindingInput], { nullable: true, description: 'Fixture channels this bar drives' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VirtualConsoleChannelBindingInput)
  public channelBindings?: VirtualConsoleChannelBindingInput[];

  @Field(() => GraphQLUUID, { nullable: true, description: 'Project function this bar starts and stops' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'functionPublicId must be a UUID' })
  public functionPublicId?: string;

  @Field({ nullable: true, description: 'Function name used to remap the binding on import' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  public functionName?: string;
}

@ObjectType()
export class VirtualConsoleBeatTimingDto {
  @Field(() => Int, { description: 'Fade in of each step in percent of the time between beats' })
  public fadeIn: number;

  @Field(() => Int, { description: 'Hold of each step in percent of the time between beats' })
  public hold: number;

  @Field(() => Int, { description: 'Fade out of each step in percent of the time between beats' })
  public fadeOut: number;
}

@InputType()
export class VirtualConsoleBeatTimingInput {
  @Field(() => Int, { description: 'Fade in of each step in percent of the time between beats' })
  @IsInt()
  @Min(0)
  @Max(100)
  public fadeIn: number;

  @Field(() => Int, { description: 'Hold of each step in percent of the time between beats' })
  @IsInt()
  @Min(0)
  @Max(100)
  public hold: number;

  @Field(() => Int, { description: 'Fade out of each step in percent of the time between beats' })
  @IsInt()
  @Min(0)
  @Max(100)
  public fadeOut: number;
}

@ObjectType()
export class VirtualConsoleBeatBarDto {
  @Field(() => Int, { description: 'Bass level in percent below which an onset does not count as a beat' })
  public minThreshold: number;

  @Field(() => GraphQLUUID, { nullable: true, description: 'Project function stepped once per beat' })
  public functionPublicId?: string;

  @Field({ nullable: true, description: 'Function name used to remap the binding on import' })
  public functionName?: string;

  @Field(() => VirtualConsoleBeatTimingDto, {
    nullable: true,
    description: 'Step timing that follows the beat. Null: each step keeps the sequence timing.',
  })
  @Type(() => VirtualConsoleBeatTimingDto)
  public timing?: VirtualConsoleBeatTimingDto;
}

@InputType()
export class VirtualConsoleBeatBarInput {
  @Field(() => Int, { description: 'Bass level in percent below which an onset does not count as a beat' })
  @IsInt()
  @Min(0)
  @Max(100)
  public minThreshold: number;

  @Field(() => GraphQLUUID, { nullable: true, description: 'Project function stepped once per beat' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'functionPublicId must be a UUID' })
  public functionPublicId?: string;

  @Field({ nullable: true, description: 'Function name used to remap the binding on import' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  public functionName?: string;

  @Field(() => VirtualConsoleBeatTimingInput, {
    nullable: true,
    description: 'Step timing that follows the beat. Null: each step keeps the sequence timing.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VirtualConsoleBeatTimingInput)
  public timing?: VirtualConsoleBeatTimingInput;
}

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

  @Field({ nullable: true, description: 'CSS font family' })
  public fontFamily?: string;

  @Field(() => Int, { nullable: true, description: 'Font size in pixels' })
  public fontSize?: number;

  @Field(() => Int, { nullable: true, description: 'CSS font weight' })
  public fontWeight?: number;

  @Field(() => VirtualConsoleSliderValueType, { nullable: true, description: 'Slider value interpretation' })
  public valueType?: VirtualConsoleSliderValueType;

  @Field(() => Int, { nullable: true, description: 'Inclusive lower DMX limit for a slider' })
  public lowerLimit?: number;

  @Field(() => Int, { nullable: true, description: 'Inclusive upper DMX limit for a slider or button' })
  public upperLimit?: number;

  @Field(() => [VirtualConsoleChannelBindingDto], {
    nullable: true,
    description: 'Fixture channels this slider or button controls',
  })
  @Type(() => VirtualConsoleChannelBindingDto)
  public channelBindings?: VirtualConsoleChannelBindingDto[];

  @Field(() => VirtualConsoleButtonMode, {
    nullable: true,
    description: 'Whether a button latches (toggle) or runs only while held (flash)',
  })
  public buttonMode?: VirtualConsoleButtonMode;

  @Field(() => GraphQLUUID, {
    nullable: true,
    description: 'Project function started by this button',
  })
  public functionPublicId?: string;

  @Field({ nullable: true, description: 'Function name used to remap a button binding on import' })
  public functionName?: string;

  @Field(() => GraphQLUUID, { nullable: true, description: 'MIDI mapping entry that drives this button or slider' })
  public midiEntryPublicId?: string | null;

  @Field(() => [String], {
    nullable: true,
    description: 'Serials of the MIDI devices this control is bound to; empty means every device using the mapping',
  })
  public midiDeviceSerials?: string[] | null;

  @Field(() => MidiFeedbackDto, { nullable: true, description: "Overrides the MIDI entry's default LED feedback" })
  @Type(() => MidiFeedbackDto)
  public feedback?: MidiFeedbackDto | null;

  @Field(() => Int, { nullable: true, description: 'Number of spectrum bands of an audio triggers control' })
  public bandCount?: number;

  @Field(() => [VirtualConsoleAudioBarDto], {
    nullable: true,
    description: 'Volume bar followed by one bar per band of an audio triggers control',
  })
  @Type(() => VirtualConsoleAudioBarDto)
  public audioBars?: VirtualConsoleAudioBarDto[];

  @Field(() => VirtualConsoleBeatBarDto, {
    nullable: true,
    description: 'Beat bar of an audio triggers control. Null on controls saved before beat bars existed.',
  })
  @Type(() => VirtualConsoleBeatBarDto)
  public beatBar?: VirtualConsoleBeatBarDto;

  @Field(() => VirtualConsoleBeatTimingDto, {
    nullable: true,
    description: 'Step timing of a global tap control, in percent of the time between taps. Null: sequence timing.',
  })
  @Type(() => VirtualConsoleBeatTimingDto)
  public tapTiming?: VirtualConsoleBeatTimingDto;
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

  @Field(() => Int, { nullable: true, description: 'Drag snap grid in pixels' })
  public snap?: number;

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

  @Field({ nullable: true, description: 'CSS font family' })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  public fontFamily?: string;

  @Field(() => Int, { nullable: true, description: 'Font size in pixels' })
  @IsOptional()
  @IsInt()
  @Min(VIRTUAL_CONSOLE_FONT_SIZE_MIN)
  @Max(VIRTUAL_CONSOLE_FONT_SIZE_MAX)
  public fontSize?: number;

  @Field(() => Int, { nullable: true, description: 'CSS font weight' })
  @IsOptional()
  @IsInt()
  @Min(VIRTUAL_CONSOLE_FONT_WEIGHT_MIN)
  @Max(VIRTUAL_CONSOLE_FONT_WEIGHT_MAX)
  public fontWeight?: number;

  @Field(() => VirtualConsoleSliderValueType, { nullable: true, description: 'Slider value interpretation' })
  @IsOptional()
  @IsEnum(VirtualConsoleSliderValueType)
  public valueType?: VirtualConsoleSliderValueType;

  @Field(() => Int, { nullable: true, description: 'Inclusive lower DMX limit for a slider' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(255)
  public lowerLimit?: number;

  @Field(() => Int, { nullable: true, description: 'Inclusive upper DMX limit for a slider or button' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(255)
  public upperLimit?: number;

  @Field(() => [VirtualConsoleChannelBindingInput], {
    nullable: true,
    description: 'Fixture channels this slider or button controls',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VirtualConsoleChannelBindingInput)
  public channelBindings?: VirtualConsoleChannelBindingInput[];

  @Field(() => VirtualConsoleButtonMode, {
    nullable: true,
    description: 'Whether a button latches (toggle) or runs only while held (flash)',
  })
  @IsOptional()
  @IsEnum(VirtualConsoleButtonMode)
  public buttonMode?: VirtualConsoleButtonMode;

  @Field(() => GraphQLUUID, {
    nullable: true,
    description: 'Project function started by this button',
  })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'functionPublicId must be a UUID' })
  public functionPublicId?: string;

  @Field({ nullable: true, description: 'Function name used to remap a button binding on import' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  public functionName?: string;

  @Field(() => GraphQLUUID, { nullable: true, description: 'MIDI mapping entry that drives this button or slider' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'midiEntryPublicId must be a UUID' })
  public midiEntryPublicId?: string | null;

  @Field(() => [String], {
    nullable: true,
    description: 'Serials of the MIDI devices this control is bound to; empty means every device using the mapping',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  @Length(1, 255, { each: true })
  public midiDeviceSerials?: string[] | null;

  @Field(() => MidiFeedbackInput, { nullable: true, description: "Overrides the MIDI entry's default LED feedback" })
  @IsOptional()
  @ValidateNested()
  @Type(() => MidiFeedbackInput)
  public feedback?: MidiFeedbackInput | null;

  @Field(() => Int, { nullable: true, description: 'Number of spectrum bands of an audio triggers control' })
  @IsOptional()
  @IsInt()
  @Min(VIRTUAL_CONSOLE_AUDIO_BANDS_MIN)
  @Max(VIRTUAL_CONSOLE_AUDIO_BANDS_MAX)
  public bandCount?: number;

  @Field(() => [VirtualConsoleAudioBarInput], {
    nullable: true,
    description: 'Volume bar followed by one bar per band of an audio triggers control',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(VIRTUAL_CONSOLE_AUDIO_BANDS_MAX + 1)
  @ValidateNested({ each: true })
  @Type(() => VirtualConsoleAudioBarInput)
  public audioBars?: VirtualConsoleAudioBarInput[];

  @Field(() => VirtualConsoleBeatBarInput, {
    nullable: true,
    description: 'Beat bar of an audio triggers control',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VirtualConsoleBeatBarInput)
  public beatBar?: VirtualConsoleBeatBarInput;

  @Field(() => VirtualConsoleBeatTimingInput, {
    nullable: true,
    description: 'Step timing of a global tap control, in percent of the time between taps. Null: sequence timing.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VirtualConsoleBeatTimingInput)
  public tapTiming?: VirtualConsoleBeatTimingInput;
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

  @Field(() => Int, { nullable: true, description: 'Drag snap grid in pixels' })
  @IsOptional()
  @IsInt()
  @Min(VIRTUAL_CONSOLE_SNAP_MIN)
  @Max(VIRTUAL_CONSOLE_SNAP_MAX)
  public snap?: number;

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
