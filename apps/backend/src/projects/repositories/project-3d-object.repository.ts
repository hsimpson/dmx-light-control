import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import project3dObject from '@/projects/entities/project-3d-object.entity';
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export const project3dObjectRelations = {
  sceneObjectType: true,
} as const;

@Injectable()
export class Project3dObjectRepository extends BaseRepository<typeof project3dObject> {
  public constructor(@InjectDb() db: NodePgDatabase<typeof relations>) {
    super(db, project3dObject, { queryKey: 'project3dObject', with: project3dObjectRelations });
  }

  public async listByProjectId(projectId: number) {
    return this.db.query.project3dObject.findMany({
      where: { projectId },
      with: project3dObjectRelations,
    });
  }
}
