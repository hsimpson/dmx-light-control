import { BaseDto } from '@/db/base.dto';
import { MidiControlType, MidiMessageType } from '@/midi-mappings/midi-mapping';
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateNested } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

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
}

@ObjectType()
export class MidiMappingDto extends BaseDto {
  @Field({ description: 'The unique name of the mapping, e.g. the controller model' })
  public name: string;

  @Field(() => [MidiMappingEntryDto], { description: 'The hardware controls of this mapping' })
  @Type(() => MidiMappingEntryDto)
  public entries: MidiMappingEntryDto[];
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
}

@ObjectType()
export class DeleteMidiMappingPayload {
  @Field(() => GraphQLUUID, { description: 'The public id that was requested for deletion' })
  public publicId: string;

  @Field({ description: 'True if a record was deleted, false if nothing matched the public id' })
  public deleted: boolean;
}
