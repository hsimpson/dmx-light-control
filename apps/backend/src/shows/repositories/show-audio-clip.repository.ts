import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import showAudioClip from '@/shows/entities/show-audio-clip.entity';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class ShowAudioClipRepository extends BaseRepository<typeof showAudioClip> {
  public constructor(@InjectDb() db: NodePgDatabase<typeof relations>) {
    super(db, showAudioClip);
  }

  /** Moves clips in one transaction, so a swap never leaves the track half updated. */
  public async updateStarts(starts: readonly { publicId: string; startMs: number }[]): Promise<void> {
    await this.db.transaction(async tx => {
      for (const { publicId, startMs } of starts) {
        await tx.update(showAudioClip).set({ startMs }).where(eq(showAudioClip.publicId, publicId));
      }
    });
  }
}
