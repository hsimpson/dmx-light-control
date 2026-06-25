import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import * as schema from '@/db/schema';
import { Injectable } from '@nestjs/common';
import { InferSelectModel } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class FixtureVendorRepository {
  public constructor(@InjectDb() private readonly db: NodePgDatabase<typeof relations>) {}

  public async findMany(): Promise<InferSelectModel<typeof schema.fixtureVendor>[]> {
    return await this.db.query.fixtureVendor.findMany();
  }

  public async findOneByPublicId(publicId: string): Promise<InferSelectModel<typeof schema.fixtureVendor> | undefined> {
    return await this.db.query.fixtureVendor.findFirst({
      where: { publicId },
    });
  }

  public async findOneByName(name: string): Promise<InferSelectModel<typeof schema.fixtureVendor> | undefined> {
    return await this.db.query.fixtureVendor.findFirst({
      where: { name },
    });
  }
}
