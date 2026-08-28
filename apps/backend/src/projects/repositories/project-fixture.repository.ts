import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import projectFixture from '@/projects/entities/project-fixture.entity';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export const projectFixtureRelations = {
  fixture: { with: { fixtureVendor: true } },
  fixtureChannelMode: { with: { fixtureChannelAssignments: true } },
} as const;

@Injectable()
export class ProjectFixtureRepository extends BaseRepository<typeof projectFixture> {
  public constructor(@InjectDb() db: NodePgDatabase<typeof relations>) {
    super(db, projectFixture, { queryKey: 'projectFixture', with: projectFixtureRelations });
  }

  public async deleteAllForProject(projectId: number): Promise<void> {
    await this.db.delete(projectFixture).where(eq(projectFixture.projectId, projectId));
  }
}
