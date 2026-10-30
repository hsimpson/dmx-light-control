import { EventsModule } from '@/events/events.module';
import { Module } from '@nestjs/common';
import { MidiMappingImportExportService } from './midi-mapping-import-export.service';
import { MidiMappingResolver } from './midi-mapping.resolver';
import { MidiMappingService } from './midi-mapping.service';
import { MidiMappingEntryRepository } from './repositories/midi-mapping-entry.repository';
import { MidiMappingRepository } from './repositories/midi-mapping.repository';

@Module({
  imports: [EventsModule],
  providers: [
    MidiMappingRepository,
    MidiMappingEntryRepository,
    MidiMappingService,
    MidiMappingImportExportService,
    MidiMappingResolver,
  ],
  exports: [MidiMappingRepository],
})
export class MidiMappingsModule {}
