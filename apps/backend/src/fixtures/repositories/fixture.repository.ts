import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import * as schema from '@/db/schema';
import { Injectable } from '@nestjs/common';
import { InferSelectModel } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class FixtureRepository {
  public constructor(@InjectDb() private readonly db: NodePgDatabase<typeof relations>) {}

  public async findMany(): Promise<InferSelectModel<typeof schema.fixture>[]> {
    return await this.db.query.fixture.findMany({
      with: {
        fixtureChannelDefinitions: { with: { fixtureChannelAssignments: true, fixtureChannelRanges: true } },
        fixtureChannelModes: { with: { fixtureChannelAssignments: true } },
        fixtureVendor: true,
      },
    });
  }

  public async findOneByPublicId(publicId: string): Promise<InferSelectModel<typeof schema.fixture> | undefined> {
    return await this.db.query.fixture.findFirst({
      where: { publicId },
      with: {
        fixtureChannelDefinitions: { with: { fixtureChannelAssignments: true, fixtureChannelRanges: true } },
        fixtureChannelModes: { with: { fixtureChannelAssignments: true } },
        fixtureVendor: true,
      },
    });
  }
}
