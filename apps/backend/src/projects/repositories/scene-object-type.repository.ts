import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import sceneObjectType from '@/projects/entities/scene-object-type.entity';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class SceneObjectTypeRepository extends BaseRepository<typeof sceneObjectType> {
  public constructor(@InjectDb() db: NodePgDatabase<typeof relations>) {
    super(db, sceneObjectType);
  }

  public async findOneById(id: number) {
    const rows = await this.db.select().from(sceneObjectType).where(eq(sceneObjectType.id, id)).limit(1);
    return rows[0];
  }
}
