import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { fixtureChannelDefinition } from '@/fixtures/entities';
import { Injectable } from '@nestjs/common';
import { InferSelectModel } from 'drizzle-orm';
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
    data: { name: string },
  ): Promise<InferSelectModel<typeof fixtureChannelDefinition> | undefined> {
    const rows = (await this.db
      .insert(fixtureChannelDefinition)
      .values({ fixtureId, name: data.name, preset: FixtureChannelPreset.Custom })
      .returning()) as InferSelectModel<typeof fixtureChannelDefinition>[];
    return rows[0];
  }
}
