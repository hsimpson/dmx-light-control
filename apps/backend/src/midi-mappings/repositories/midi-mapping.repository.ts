import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import * as schema from '@/db/schema';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

const midiMappingRelations = {
  midiMappingEntries: { orderBy: { id: 'asc' } },
} as const;

export type LoadedMidiMapping = NonNullable<Awaited<ReturnType<MidiMappingRepository['findOneWithEntries']>>>;

@Injectable()
export class MidiMappingRepository extends BaseRepository<typeof schema.midiMapping> {
  public constructor(@InjectDb() db: NodePgDatabase<typeof relations>) {
    super(db, schema.midiMapping);
  }

  public async findOneWithEntries(publicId: string) {
    return this.db.query.midiMapping.findFirst({ where: { publicId }, with: midiMappingRelations });
  }

  public async findManyWithEntries() {
    return this.db.query.midiMapping.findMany({ orderBy: { name: 'asc' }, with: midiMappingRelations });
  }
}
