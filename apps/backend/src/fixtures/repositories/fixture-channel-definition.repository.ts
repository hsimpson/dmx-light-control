import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { fixtureChannelDefinition, fixtureChannelRange } from '@/fixtures/entities';
import { Injectable } from '@nestjs/common';
import { eq, inArray, InferSelectModel } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export const fixtureChannelDefinitionRelations = {
  fixtureChannelRanges: true,
} as const;

@Injectable()
export class FixtureChannelDefinitionRepository extends BaseRepository<typeof fixtureChannelDefinition> {
  public constructor(@InjectDb() db: NodePgDatabase<typeof relations>) {
    super(db, fixtureChannelDefinition, {
      queryKey: 'fixtureChannelDefinition',
      with: fixtureChannelDefinitionRelations,
    });
  }

  public async createOneForFixture(
    fixtureId: number,
    data: { name: string; preset?: FixtureChannelPreset; order?: number },
  ): Promise<InferSelectModel<typeof fixtureChannelDefinition> | undefined> {
    const rows = (await this.db
      .insert(fixtureChannelDefinition)
      .values({
        fixtureId,
        name: data.name,
        preset: data.preset ?? FixtureChannelPreset.Custom,
        ...(data.order !== undefined ? { order: data.order } : {}),
      })
      .returning()) as InferSelectModel<typeof fixtureChannelDefinition>[];
    return rows[0];
  }

  public async replaceRangesForDefinition(
    definitionId: number,
    ranges: { publicId?: string; dmxStart: number; dmxEnd: number; description: string }[],
  ): Promise<void> {
    await this.db.transaction(async tx => {
      const existing = await tx
        .select()
        .from(fixtureChannelRange)
        .where(eq(fixtureChannelRange.fixtureChannelDefinitionId, definitionId));
      const existingByPublicId = new Map(existing.map(row => [row.publicId, row]));
      const keptIds = new Set<number>();

      for (const range of ranges) {
        const existingRow = range.publicId ? existingByPublicId.get(range.publicId) : undefined;
        if (existingRow && typeof existingRow.id === 'number') {
          await tx
            .update(fixtureChannelRange)
            .set({
              dmxStart: range.dmxStart,
              dmxEnd: range.dmxEnd,
              description: range.description,
            })
            .where(eq(fixtureChannelRange.id, existingRow.id));
          keptIds.add(existingRow.id);
          continue;
        }

        const inserted = (await tx
          .insert(fixtureChannelRange)
          .values({
            fixtureChannelDefinitionId: definitionId,
            dmxStart: range.dmxStart,
            dmxEnd: range.dmxEnd,
            description: range.description,
          })
          .returning()) as InferSelectModel<typeof fixtureChannelRange>[];
        const row = inserted[0];
        if (row && typeof row.id === 'number') {
          keptIds.add(row.id);
        }
      }

      const idsToDelete = existing.flatMap(row => (typeof row.id === 'number' && !keptIds.has(row.id) ? [row.id] : []));
      if (idsToDelete.length > 0) {
        await tx.delete(fixtureChannelRange).where(inArray(fixtureChannelRange.id, idsToDelete));
      }
    });
  }
}
