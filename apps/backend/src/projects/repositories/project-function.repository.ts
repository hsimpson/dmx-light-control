import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import project from '@/projects/entities/project.entity';
import projectFunction from '@/projects/entities/project-function.entity';
import { removeFunctionBindings } from '@/projects/virtual-console.validation';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
      await tx.delete(projectFunction).where(eq(projectFunction.publicId, publicId));
    });
    return true;
  }
}
