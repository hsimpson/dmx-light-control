import { InjectDb } from '@/db/db.provider';
import { DrizzleRepository } from '@/db/drizzleRepository';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres/driver';
import { vendor } from '../entities';

@Injectable()
export class VendorRepository extends DrizzleRepository {
  public constructor(@InjectDb() db: NodePgDatabase) {
    super(db, vendor);
  }
}
