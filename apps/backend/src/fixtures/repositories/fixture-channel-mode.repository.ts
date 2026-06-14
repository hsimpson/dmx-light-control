import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/db.provider';
import { fixtureChannelMode } from '@/fixtures/entities';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class FixtureChannelModeRepository extends BaseRepository<typeof fixtureChannelMode, 'fixtureChannelMode'> {
  public constructor(@InjectDb() db: NodePgDatabase) {
    super(db, fixtureChannelMode, 'fixtureChannelMode');
  }
}
