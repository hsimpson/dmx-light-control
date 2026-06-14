import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/db.provider';
import { fixtureChannelAssignment } from '@/fixtures/entities';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class FixtureChannelAssignmentRepository extends BaseRepository<
  typeof fixtureChannelAssignment,
  'fixtureChannelAssignment'
> {
  public constructor(@InjectDb() db: NodePgDatabase) {
    super(db, fixtureChannelAssignment, 'fixtureChannelAssignment');
  }
}
