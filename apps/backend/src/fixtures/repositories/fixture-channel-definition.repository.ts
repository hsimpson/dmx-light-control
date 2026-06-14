import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/db.provider';
import { fixtureChannelDefinition } from '@/fixtures/entities';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class FixtureChannelDefinitionRepository extends BaseRepository<
  typeof fixtureChannelDefinition,
  'fixtureChannelDefinition'
> {
  public constructor(@InjectDb() db: NodePgDatabase) {
    super(db, fixtureChannelDefinition, 'fixtureChannelDefinition');
  }
}
