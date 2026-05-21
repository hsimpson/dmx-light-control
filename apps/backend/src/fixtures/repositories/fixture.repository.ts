import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/db.provider';
import { fixture } from '@/fixtures/entities';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class FixtureRepository extends BaseRepository<
  typeof fixture,
  'fixture'
> {
  public constructor(@InjectDb() db: NodePgDatabase) {
    super(db, fixture, 'fixture');
  }
}
