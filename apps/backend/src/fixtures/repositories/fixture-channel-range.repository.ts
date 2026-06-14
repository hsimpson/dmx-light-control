import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/db.provider';
import { fixtureChannelRange } from '@/fixtures/entities';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class FixtureChannelRangeRepository extends BaseRepository<typeof fixtureChannelRange, 'fixtureChannelRange'> {
  public constructor(@InjectDb() db: NodePgDatabase) {
    super(db, fixtureChannelRange, 'fixtureChannelRange');
  }
}
