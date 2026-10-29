import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import * as schema from '@/db/schema';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class MidiMappingEntryRepository extends BaseRepository<typeof schema.midiMappingEntry> {
  public constructor(@InjectDb() db: NodePgDatabase<typeof relations>) {
    super(db, schema.midiMappingEntry);
  }
}
