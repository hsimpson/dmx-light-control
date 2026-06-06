import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/db.provider';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { fixtureVendor } from '../entities';

@Injectable()
export class VendorRepository extends BaseRepository<typeof fixtureVendor, 'fixtureVendor'> {
  public constructor(@InjectDb() db: NodePgDatabase) {
    super(db, fixtureVendor, 'fixtureVendor');
  }
}
