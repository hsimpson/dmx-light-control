import { Module } from '@nestjs/common';
import { MidiMappingResolver } from './midi-mapping.resolver';
import { MidiMappingService } from './midi-mapping.service';
import { MidiMappingEntryRepository } from './repositories/midi-mapping-entry.repository';
import { MidiMappingRepository } from './repositories/midi-mapping.repository';

@Module({
  providers: [MidiMappingRepository, MidiMappingEntryRepository, MidiMappingService, MidiMappingResolver],
})
export class MidiMappingsModule {}
