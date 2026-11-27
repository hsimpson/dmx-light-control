import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import show from '@/shows/entities/show.entity';
import project from '@/projects/entities/project.entity';
import { keepShowBindings } from '@/projects/virtual-console.validation';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

const withAudioClips = { audioClips: { orderBy: { startMs: 'asc' } } } as const;

@Injectable()
export class ShowRepository extends BaseRepository<typeof show> {
  public constructor(@InjectDb() db: NodePgDatabase<typeof relations>) {
    super(db, show);
  }

  public async listByProjectId(projectId: number) {
    return this.db.query.show.findMany({
      where: { projectId },
      with: withAudioClips,
      orderBy: { name: 'asc' },
    });
  }

  /** Deletes the show and unsets virtual console controls that play it, in one transaction. */
  public async deleteAndUnbind(publicId: string): Promise<boolean> {
    return this.db.transaction(async tx => {
      const existing = await tx.query.show.findFirst({ where: { publicId }, with: { project: true } });
      if (!existing?.project) return false;
      const { id: projectId, virtualConsole } = existing.project;
      if (virtualConsole && projectId) {
        await tx
          .update(project)
          .set({ virtualConsole: keepShowBindings(virtualConsole, id => id !== publicId) })
          .where(eq(project.id, projectId));
      }
      await tx.delete(show).where(eq(show.publicId, publicId));
      return true;
    });
  }

  public async findLoadedByPublicId(publicId: string) {
    return this.db.query.show.findFirst({ where: { publicId }, with: withAudioClips });
  }
}

export type LoadedShow = NonNullable<Awaited<ReturnType<ShowRepository['findLoadedByPublicId']>>>;
