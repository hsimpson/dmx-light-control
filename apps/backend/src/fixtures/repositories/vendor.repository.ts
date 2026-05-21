import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/db.provider';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { vendor } from '../entities';

@Injectable()
export class VendorRepository extends BaseRepository<typeof vendor> {
  public constructor(@InjectDb() db: NodePgDatabase) {
    super(db, vendor);
  }
}
