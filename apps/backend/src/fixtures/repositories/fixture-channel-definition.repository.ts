import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { fixtureChannelDefinition, fixtureChannelRange } from '@/fixtures/entities';
import { Injectable } from '@nestjs/common';
import { eq, InferSelectModel } from 'drizzle-orm';
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
    ranges: { dmxStart: number; dmxEnd: number; description: string }[],
  ): Promise<void> {
    await this.db.transaction(async tx => {
      await tx.delete(fixtureChannelRange).where(eq(fixtureChannelRange.fixtureChannelDefinitionId, definitionId));
      if (ranges.length === 0) {
        return;
      }
      await tx.insert(fixtureChannelRange).values(
        ranges.map(range => ({
          fixtureChannelDefinitionId: definitionId,
          dmxStart: range.dmxStart,
          dmxEnd: range.dmxEnd,
          description: range.description,
        })),
      );
    });
  }
}
