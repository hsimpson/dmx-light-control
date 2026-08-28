import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import * as schema from '@/db/schema';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { projectFixtureRelations } from './project-fixture.repository';

export const projectRelations = {
  projectFixtures: {
    with: projectFixtureRelations,
  },
} as const;

export type LoadedProject = NonNullable<Awaited<ReturnType<ProjectRepository['findOneByPublicIdWithFixtures']>>>;

@Injectable()
export class ProjectRepository extends BaseRepository<typeof schema.project> {
  public constructor(@InjectDb() db: NodePgDatabase<typeof relations>) {
    super(db, schema.project);
  }

  public async findOneByPublicIdWithFixtures(publicId: string) {
    return this.db.query.project.findFirst({
      where: { publicId },
      with: projectRelations,
    });
  }

  public async findManyWithFixtures() {
    return this.db.query.project.findMany({ with: projectRelations });
  }
}
