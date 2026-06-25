import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import fixture from '@/fixtures/entities/fixture.entity';
import { Injectable } from '@nestjs/common';
import { eq, InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class FixtureRepository {
  public constructor(@InjectDb() private readonly db: NodePgDatabase<typeof relations>) {}

  public async findMany(): Promise<InferSelectModel<typeof fixture>[]> {
    return await this.db.query.fixture.findMany({
      with: {
        fixtureChannelDefinitions: { with: { fixtureChannelAssignments: true, fixtureChannelRanges: true } },
        fixtureChannelModes: { with: { fixtureChannelAssignments: true } },
        fixtureVendor: true,
      },
    });
  }

  public async findOneByPublicId(publicId: string): Promise<InferSelectModel<typeof fixture> | undefined> {
    return await this.db.query.fixture.findFirst({
      where: { publicId },
      with: {
        fixtureChannelDefinitions: { with: { fixtureChannelAssignments: true, fixtureChannelRanges: true } },
        fixtureChannelModes: { with: { fixtureChannelAssignments: true } },
        fixtureVendor: true,
      },
    });
  }

  public async updateOneByPublicId(
    publicId: string,
    data: Partial<InferInsertModel<typeof fixture>>,
  ): Promise<InferSelectModel<typeof fixture> | undefined> {
    const result = await this.db.update(fixture).set(data).where(eq(fixture.publicId, publicId)).returning();
    return result[0];
  }
}
