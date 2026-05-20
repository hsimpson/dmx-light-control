import { InjectDb } from '@/db/db.provider';
import { DrizzleRepository } from '@/db/drizzleRepository';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres/driver';
import { fixture } from '../entities';

@Injectable()
export class FixtureRepository extends DrizzleRepository {
  public constructor(@InjectDb() db: NodePgDatabase) {
    super(db, fixture);
  }
}
