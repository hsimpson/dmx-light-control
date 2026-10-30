import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { plainToInstance } from 'class-transformer';
import { GraphQLUUID } from 'graphql-scalars';
import {
  AddMidiMappingEntryInput,
  CreateMidiMappingInput,
  DeleteMidiMappingPayload,
  MidiMappingDto,
  MidiMappingEntryDto,
  UpdateMidiMappingEntryInput,
  UpdateMidiMappingInput,
} from './dto/midi-mapping.dto';
import {
  ImportMidiMappingsInput,
  ImportMidiMappingsPayload,
  MidiMappingExportDocumentDto,
} from './dto/midi-mapping-import-export.dto';
import { MidiMappingImportExportService } from './midi-mapping-import-export.service';
import { MidiMappingService } from './midi-mapping.service';

@Resolver()
export class MidiMappingResolver {
  public constructor(
    private readonly midiMappingService: MidiMappingService,
    private readonly importExportService: MidiMappingImportExportService,
  ) {}

  @Query(() => MidiMappingExportDocumentDto, {
    name: 'exportMidiMappings',
    description: 'export all MIDI mappings with their entries as a versioned JSON document',
  })
  public async exportMidiMappings(): Promise<MidiMappingExportDocumentDto> {
    return plainToInstance(MidiMappingExportDocumentDto, await this.importExportService.exportMappings());
  }

  @Mutation(() => ImportMidiMappingsPayload, {
    name: 'importMidiMappings',
    description: 'import MIDI mappings from a versioned JSON document, upserting by publicId or name',
  })
  public async importMidiMappings(
    @Args('document') document: ImportMidiMappingsInput,
  ): Promise<ImportMidiMappingsPayload> {
    return plainToInstance(ImportMidiMappingsPayload, await this.importExportService.importMappings(document));
  }

  @Query(() => [MidiMappingDto], { name: 'midiMappings', description: 'get all MIDI mappings with their entries' })
  public async getAll(): Promise<MidiMappingDto[]> {
    return plainToInstance(MidiMappingDto, await this.midiMappingService.getAll());
  }

  @Query(() => MidiMappingDto, { name: 'midiMapping', description: 'get a MIDI mapping by public id' })
  public async getOne(@Args('publicId', { type: () => GraphQLUUID }) publicId: string): Promise<MidiMappingDto> {
    return plainToInstance(MidiMappingDto, await this.midiMappingService.getOne(publicId));
  }

  @Mutation(() => MidiMappingDto, { name: 'createMidiMapping', description: 'create a MIDI mapping' })
  public async create(@Args('input') input: CreateMidiMappingInput): Promise<MidiMappingDto> {
    return plainToInstance(MidiMappingDto, await this.midiMappingService.create(input));
  }

  @Mutation(() => MidiMappingDto, { name: 'updateMidiMapping', description: 'rename a MIDI mapping' })
  public async update(@Args('input') input: UpdateMidiMappingInput): Promise<MidiMappingDto> {
    return plainToInstance(MidiMappingDto, await this.midiMappingService.update(input));
  }

  @Mutation(() => DeleteMidiMappingPayload, {
    name: 'deleteMidiMapping',
    description: 'delete a MIDI mapping and its entries by public id',
  })
  public async delete(
    @Args('publicId', { type: () => GraphQLUUID }) publicId: string,
  ): Promise<DeleteMidiMappingPayload> {
    return plainToInstance(DeleteMidiMappingPayload, await this.midiMappingService.delete(publicId));
  }

  @Mutation(() => MidiMappingEntryDto, { name: 'addMidiMappingEntry', description: 'add an entry to a MIDI mapping' })
  public async addEntry(@Args('input') input: AddMidiMappingEntryInput): Promise<MidiMappingEntryDto> {
    return plainToInstance(MidiMappingEntryDto, await this.midiMappingService.addEntry(input));
  }

  @Mutation(() => MidiMappingEntryDto, { name: 'updateMidiMappingEntry', description: 'update a MIDI mapping entry' })
  public async updateEntry(@Args('input') input: UpdateMidiMappingEntryInput): Promise<MidiMappingEntryDto> {
    return plainToInstance(MidiMappingEntryDto, await this.midiMappingService.updateEntry(input));
  }

  @Mutation(() => DeleteMidiMappingPayload, {
    name: 'deleteMidiMappingEntry',
    description: 'delete a MIDI mapping entry by public id',
  })
  public async deleteEntry(
    @Args('publicId', { type: () => GraphQLUUID }) publicId: string,
  ): Promise<DeleteMidiMappingPayload> {
    return plainToInstance(DeleteMidiMappingPayload, await this.midiMappingService.deleteEntry(publicId));
  }
}
