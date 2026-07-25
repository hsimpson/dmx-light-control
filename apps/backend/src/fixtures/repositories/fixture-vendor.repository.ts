import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import * as schema from '@/db/schema';
import { Injectable } from '@nestjs/common';
import { InferSelectModel } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class FixtureVendorRepository extends BaseRepository<typeof schema.fixtureVendor> {
  public constructor(@InjectDb() db: NodePgDatabase<typeof relations>) {
    super(db, schema.fixtureVendor);
  }

  public async findOneByName(name: string): Promise<InferSelectModel<typeof schema.fixtureVendor> | undefined> {
    return await this.db.query.fixtureVendor.findFirst({
      where: { name },
    });
  }
}
