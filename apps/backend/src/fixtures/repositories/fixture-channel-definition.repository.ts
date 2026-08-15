import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import { fixtureChannelDefinition } from '@/fixtures/entities';
import { Injectable } from '@nestjs/common';
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
}
