import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import project from '@/projects/entities/project.entity';
import projectFunction from '@/projects/entities/project-function.entity';
import { removeFunctionBindings } from '@/projects/virtual-console.validation';
import show from '@/shows/entities/show.entity';
import { clipFunctionIds, removeFunctionClips } from '@/shows/show';
import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class ProjectFunctionRepository extends BaseRepository<typeof projectFunction> {
  public constructor(@InjectDb() db: NodePgDatabase<typeof relations>) {
    super(db, projectFunction);
  }

  public async listByProjectId(projectId: number) {
    return this.db.query.projectFunction.findMany({
      where: { projectId },
    });
  }

  public async deleteByPublicIdAndUnbind(publicId: string): Promise<boolean> {
    const existing = await this.findOneByPublicId(publicId);
    if (!existing?.id) {
      return false;
    }
    const projectId = existing.projectId;

    await this.db.transaction(async tx => {
      const projectRow = await tx.query.project.findFirst({
        where: { id: projectId },
      });
      if (projectRow?.virtualConsole) {
        await tx
          .update(project)
          .set({ virtualConsole: removeFunctionBindings(projectRow.virtualConsole, publicId) })
          .where(eq(project.id, projectId));
      }
      const shows = await tx.query.show.findMany({ where: { projectId } });
      for (const row of shows.filter(candidate => clipFunctionIds(candidate.lightTracks).has(publicId))) {
        await tx
          .update(show)
          .set({ lightTracks: removeFunctionClips(row.lightTracks, publicId) })
          .where(and(eq(show.projectId, projectId), eq(show.name, row.name)));
      }
      await tx.delete(projectFunction).where(eq(projectFunction.publicId, publicId));
    });
    return true;
  }
}
