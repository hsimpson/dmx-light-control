import { BaseDto } from '@/db/base.dto';
import { MidiControlType, MidiLedType, MidiMessageType } from '@/midi-mappings/midi-mapping';
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

@ObjectType()
export class MidiLedStateDto {
  @Field(() => Int, { description: 'LED behavior, sent as the Note-On MIDI channel (0-15)' })
  public behavior: number;

  @Field(() => Int, { description: 'LED color, sent as the Note-On velocity (0-127)' })
  public color: number;
}

@InputType()
export class MidiLedStateInput {
  @Field(() => Int, { description: 'LED behavior, sent as the Note-On MIDI channel (0-15)' })
  @IsInt()
  @Min(0)
  @Max(15)
  public behavior: number;

  @Field(() => Int, { description: 'LED color, sent as the Note-On velocity (0-127)' })
  @IsInt()
  @Min(0)
  @Max(127)
  public color: number;
}

@ObjectType()
export class MidiFeedbackDto {
  @Field(() => MidiLedStateDto, { description: 'LED state while the bound control is off' })
  @Type(() => MidiLedStateDto)
  public off: MidiLedStateDto;

  @Field(() => MidiLedStateDto, { description: 'LED state while the bound control is on' })
  @Type(() => MidiLedStateDto)
  public on: MidiLedStateDto;

  @Field(() => MidiLedStateDto, {
    nullable: true,
    description: 'LED state while the bound function runs but was started elsewhere; falls back to on',
  })
  @Type(() => MidiLedStateDto)
  public monitor?: MidiLedStateDto | null;
}

@InputType()
export class MidiFeedbackInput {
  @Field(() => MidiLedStateInput, { description: 'LED state while the bound control is off' })
  @ValidateNested()
  @Type(() => MidiLedStateInput)
  public off: MidiLedStateInput;

  @Field(() => MidiLedStateInput, { description: 'LED state while the bound control is on' })
  @ValidateNested()
  @Type(() => MidiLedStateInput)
  public on: MidiLedStateInput;

  @Field(() => MidiLedStateInput, {
    nullable: true,
    description: 'LED state while the bound function runs but was started elsewhere; falls back to on',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MidiLedStateInput)
  public monitor?: MidiLedStateInput | null;
}

@ObjectType()
export class MidiLedOptionDto {
  @Field({ description: 'Display name, e.g. "Red" or "Blink 1/8"' })
  public name: string;

  @Field(() => Int, { description: 'Behavior: Note-On channel (0-15); color: velocity (0-127)' })
  public value: number;

  @Field(() => String, { nullable: true, description: 'Swatch color #RRGGBB (colors only)' })
  public hex?: string | null;
}

@ObjectType()
export class MidiLedPaletteDto {
  @Field(() => [MidiLedOptionDto], { description: 'Named LED behaviors' })
  @Type(() => MidiLedOptionDto)
  public behaviors: MidiLedOptionDto[];

  @Field(() => [MidiLedOptionDto], { description: 'Named LED colors' })
  @Type(() => MidiLedOptionDto)
  public colors: MidiLedOptionDto[];
}

@ObjectType()
export class MidiLedPalettesDto {
  @Field(() => MidiLedPaletteDto, { nullable: true, description: 'Choices for RGB LEDs' })
  @Type(() => MidiLedPaletteDto)
  public rgb?: MidiLedPaletteDto | null;

  @Field(() => MidiLedPaletteDto, { nullable: true, description: 'Choices for single-color LEDs' })
  @Type(() => MidiLedPaletteDto)
  public single?: MidiLedPaletteDto | null;
}

@InputType()
export class MidiLedBehaviorOptionInput {
  @Field({ description: 'Display name, e.g. "Blink 1/8"' })
  @IsString()
  @Length(1, 64)
  public name: string;

  @Field(() => Int, { description: 'Note-On channel (0-15)' })
  @IsInt()
  @Min(0)
  @Max(15)
  public value: number;

  @Field(() => String, { nullable: true, description: 'Unused for behaviors' })
  @IsOptional()
  @Matches(HEX_COLOR_PATTERN)
  public hex?: string | null;
}

@InputType()
export class MidiLedColorOptionInput {
  @Field({ description: 'Display name, e.g. "Red"' })
  @IsString()
  @Length(1, 64)
  public name: string;

  @Field(() => Int, { description: 'Velocity (0-127)' })
  @IsInt()
  @Min(0)
  @Max(127)
  public value: number;

  @Field(() => String, { nullable: true, description: 'Swatch color #RRGGBB' })
  @IsOptional()
  @Matches(HEX_COLOR_PATTERN)
  public hex?: string | null;
}

@InputType()
export class MidiLedPaletteInput {
  @Field(() => [MidiLedBehaviorOptionInput], { description: 'Named LED behaviors (max 16)' })
  @IsArray()
  @ArrayMaxSize(16)
  @ValidateNested({ each: true })
  @Type(() => MidiLedBehaviorOptionInput)
  public behaviors: MidiLedBehaviorOptionInput[];

  @Field(() => [MidiLedColorOptionInput], { description: 'Named LED colors (max 128)' })
  @IsArray()
  @ArrayMaxSize(128)
  @ValidateNested({ each: true })
  @Type(() => MidiLedColorOptionInput)
  public colors: MidiLedColorOptionInput[];
}

@InputType()
export class MidiLedPalettesInput {
  @Field(() => MidiLedPaletteInput, { nullable: true, description: 'Choices for RGB LEDs' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MidiLedPaletteInput)
  public rgb?: MidiLedPaletteInput | null;

  @Field(() => MidiLedPaletteInput, { nullable: true, description: 'Choices for single-color LEDs' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MidiLedPaletteInput)
  public single?: MidiLedPaletteInput | null;
}

@ObjectType()
export class MidiMappingEntryDto extends BaseDto {
  @Field({ description: 'The name of the hardware control, unique within the mapping' })
  public name: string;

  @Field(() => MidiControlType, { description: 'Kind of hardware control' })
  public controlType: MidiControlType;

  @Field(() => MidiMessageType, { description: 'MIDI message kind the control sends' })
  public messageType: MidiMessageType;

  @Field(() => Int, { description: 'MIDI channel (0-15)' })
  public channel: number;

  @Field(() => Int, { description: 'Note or controller number (0-127)' })
  public number: number;

  @Field(() => MidiFeedbackDto, { nullable: true, description: 'LED feedback, null when the control has no LED' })
  @Type(() => MidiFeedbackDto)
  public feedback: MidiFeedbackDto | null;
  @Field(() => MidiLedType, { nullable: true, description: 'LED kind; picks the palette the editors offer' })
  public ledType: MidiLedType | null;
}

@ObjectType()
export class MidiMappingDto extends BaseDto {
  @Field({ description: 'The unique name of the mapping, e.g. the controller model' })
  public name: string;

  @Field(() => [MidiMappingEntryDto], { description: 'The hardware controls of this mapping' })
  @Type(() => MidiMappingEntryDto)
  public entries: MidiMappingEntryDto[];
  @Field(() => MidiLedPalettesDto, { description: 'Named LED behaviors and colors per LED type' })
  @Type(() => MidiLedPalettesDto)
  public ledPalettes: MidiLedPalettesDto;
}

@InputType()
export class CreateMidiMappingInput {
  @Field({ description: 'The unique name of the mapping' })
  @IsString()
  @Length(1, 255)
  public name: string;
}

@InputType()
export class UpdateMidiMappingInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the mapping' })
  @IsUUID('4')
  public publicId: string;

  @Field({ description: 'The unique name of the mapping' })
  @IsString()
  @Length(1, 255)
  public name: string;
  @Field(() => MidiLedPalettesInput, { nullable: true, description: 'Named LED choices; omit to keep them' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MidiLedPalettesInput)
  public ledPalettes?: MidiLedPalettesInput;
}

@InputType()
export class AddMidiMappingEntryInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the mapping' })
  @IsUUID('4')
  public midiMappingPublicId: string;

  @Field({ description: 'The name of the hardware control, unique within the mapping' })
  @IsString()
  @Length(1, 255)
  public name: string;

  @Field(() => MidiControlType, { description: 'Kind of hardware control' })
  @IsEnum(MidiControlType)
  public controlType: MidiControlType;

  @Field(() => MidiMessageType, { description: 'MIDI message kind the control sends' })
  @IsEnum(MidiMessageType)
  public messageType: MidiMessageType;

  @Field(() => Int, { description: 'MIDI channel (0-15)' })
  @IsInt()
  @Min(0)
  @Max(15)
  public channel: number;

  @Field(() => Int, { description: 'Note or controller number (0-127)' })
  @IsInt()
  @Min(0)
  @Max(127)
  public number: number;

  @Field(() => MidiFeedbackInput, { nullable: true, description: 'LED feedback; omit when the control has no LED' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MidiFeedbackInput)
  public feedback?: MidiFeedbackInput | null;

  @Field(() => MidiLedType, { nullable: true, description: 'LED kind; picks the palette the editors offer' })
  @IsOptional()
  @IsEnum(MidiLedType)
  public ledType?: MidiLedType | null;
}

@InputType()
export class UpdateMidiMappingEntryInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the entry' })
  @IsUUID('4')
  public publicId: string;

  @Field({ nullable: true, description: 'The name of the hardware control, unique within the mapping' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  public name?: string;

  @Field(() => MidiControlType, { nullable: true, description: 'Kind of hardware control' })
  @IsOptional()
  @IsEnum(MidiControlType)
  public controlType?: MidiControlType;

  @Field(() => MidiMessageType, { nullable: true, description: 'MIDI message kind the control sends' })
  @IsOptional()
  @IsEnum(MidiMessageType)
  public messageType?: MidiMessageType;

  @Field(() => Int, { nullable: true, description: 'MIDI channel (0-15)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(15)
  public channel?: number;

  @Field(() => Int, { nullable: true, description: 'Note or controller number (0-127)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(127)
  public number?: number;

  @Field(() => MidiFeedbackInput, {
    nullable: true,
    description: 'LED feedback; omit to keep it, null to remove it',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MidiFeedbackInput)
  public feedback?: MidiFeedbackInput | null;

  @Field(() => MidiLedType, { nullable: true, description: 'LED kind; omit to keep it, null to remove it' })
  @IsOptional()
  @IsEnum(MidiLedType)
  public ledType?: MidiLedType | null;
}

@ObjectType()
export class DeleteMidiMappingPayload {
  @Field(() => GraphQLUUID, { description: 'The public id that was requested for deletion' })
  public publicId: string;

  @Field({ description: 'True if a record was deleted, false if nothing matched the public id' })
  public deleted: boolean;
}
