import { ImportTimestampsInput } from '@/db/import-timestamps.input';
import { Field, InputType, Int, ObjectType, OmitType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Length, ValidateNested } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';
import { AddMidiMappingEntryInput, MidiLedPalettesInput, MidiMappingDto } from './midi-mapping.dto';

@ObjectType()
export class MidiMappingExportDocumentDto {
  @Field(() => Int, { description: 'The MIDI mapping export document schema version' })
  public schemaVersion: number;

  @Field(() => [MidiMappingDto], { description: 'All MIDI mappings with their entries' })
  @Type(() => MidiMappingDto)
  public mappings: MidiMappingDto[];
}

@InputType()
export class ImportMidiMappingEntryInput extends OmitType(
  AddMidiMappingEntryInput,
  ['midiMappingPublicId'] as const,
  InputType,
) {
  @Field(() => GraphQLUUID, { nullable: true, description: 'Kept so virtual console bindings survive the import' })
  @IsOptional()
  @IsUUID('4')
  public publicId?: string;

  @Field({ nullable: true, description: 'The date and time when the entity was created' })
  @IsOptional()
  public createdAt?: Date;

  @Field({ nullable: true, description: 'The date and time when the entity was last updated' })
  @IsOptional()
  public updatedAt?: Date;
}

@InputType()
export class ImportMidiMappingInput extends ImportTimestampsInput {
  @Field(() => GraphQLUUID, { nullable: true, description: 'Upsert key, together with the name' })
  @IsOptional()
  @IsUUID('4')
  public publicId?: string;

  @Field({ description: 'The unique name of the mapping' })
  @IsString()
  @Length(1, 255)
  public name: string;

  @Field(() => MidiLedPalettesInput, { nullable: true, description: 'Named LED choices; omit to keep the stored ones' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MidiLedPalettesInput)
  public ledPalettes?: MidiLedPalettesInput | null;

  @Field(() => [ImportMidiMappingEntryInput], { description: 'Replaces all entries of the mapping' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMidiMappingEntryInput)
  public entries: ImportMidiMappingEntryInput[];
}

@InputType()
export class ImportMidiMappingsInput {
  @Field(() => Int, { description: 'The MIDI mapping export document schema version' })
  @IsInt()
  public schemaVersion: number;

  @Field(() => [ImportMidiMappingInput], { description: 'The mappings to upsert by publicId or name' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMidiMappingInput)
  public mappings: ImportMidiMappingInput[];
}

@ObjectType()
export class ImportMidiMappingsPayload {
  @Field(() => Int, { description: 'The number of mappings upserted from the document' })
  public importedCount: number;

  @Field(() => [MidiMappingDto], { description: 'The imported mappings with their entries' })
  @Type(() => MidiMappingDto)
  public mappings: MidiMappingDto[];
}
