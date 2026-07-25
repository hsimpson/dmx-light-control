import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import fixture from '@/fixtures/entities/fixture.entity';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export const fixtureRelations = {
  fixtureChannelDefinitions: { with: { fixtureChannelAssignments: true, fixtureChannelRanges: true } },
  fixtureChannelModes: { with: { fixtureChannelAssignments: true } },
  fixtureVendor: true,
} as const;

@Injectable()
export class FixtureRepository extends BaseRepository<typeof fixture> {
  public constructor(@InjectDb() db: NodePgDatabase<typeof relations>) {
    super(db, fixture, { queryKey: 'fixture', with: fixtureRelations });
  }
}
