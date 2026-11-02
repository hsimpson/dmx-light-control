import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import * as schema from '@/db/schema';
import { Injectable } from '@nestjs/common';
import { inArray, sql } from 'drizzle-orm';
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

  public async findExistingPublicIds(publicIds: string[]): Promise<Set<string>> {
    if (publicIds.length === 0) return new Set();
    const rows = await this.db
      .select({ publicId: schema.midiMapping.publicId })
      .from(schema.midiMapping)
      .where(inArray(schema.midiMapping.publicId, publicIds));
    return new Set(rows.flatMap(row => (row.publicId ? [row.publicId] : [])));
  }

  /** `projects.io_devices` is jsonb without a FK, so references are found by containment. */
  public async isAssignedToProject(publicId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.project.id })
      .from(schema.project)
      .where(sql`${schema.project.ioDevices} @> ${JSON.stringify([{ midiMappingPublicId: publicId }])}::jsonb`)
      .limit(1);
    return rows.length > 0;
  }
}
