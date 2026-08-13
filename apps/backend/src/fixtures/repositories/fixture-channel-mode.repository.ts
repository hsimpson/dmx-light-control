import { BaseRepository } from '@/db/base.repository';
import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import { fixtureChannelAssignment, fixtureChannelMode } from '@/fixtures/entities';
import { ChannelModeAlreadyExistsException, ChannelModeNotFoundException } from '@/fixtures/fixture.exceptions';
import { Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type ReplaceFixtureChannelModeAssignmentInput = {
  channelDefinitionId: number;
};

export type ReplaceFixtureChannelModeInput = {
  publicId?: string;
  name: string;
  assignments: ReplaceFixtureChannelModeAssignmentInput[];
};

@Injectable()
export class FixtureChannelModeRepository extends BaseRepository<typeof fixtureChannelMode> {
  public constructor(@InjectDb() db: NodePgDatabase<typeof relations>) {
    super(db, fixtureChannelMode);
  }

  public async replaceAllForFixture(fixtureId: number, modes: ReplaceFixtureChannelModeInput[]): Promise<void> {
    await this.db.transaction(async tx => {
      const existing = await tx.select().from(fixtureChannelMode).where(eq(fixtureChannelMode.fixtureId, fixtureId));
      const existingByPublicId = new Map(
        existing.flatMap(mode => (mode.publicId ? [[mode.publicId, mode] as const] : [])),
      );
      const incomingPublicIds = new Set(modes.flatMap(mode => (mode.publicId ? [mode.publicId] : [])));
      const toDeleteIds = existing
        .filter(mode => !mode.publicId || !incomingPublicIds.has(mode.publicId))
        .map(mode => mode.id)
        .filter((id): id is number => id !== null);

      if (toDeleteIds.length > 0) {
        await tx.delete(fixtureChannelMode).where(inArray(fixtureChannelMode.id, toDeleteIds));
      }

      for (const [index, mode] of modes.entries()) {
        let modeId: number;

        if (mode.publicId) {
          const existingModeId = existingByPublicId.get(mode.publicId)?.id;
          if (existingModeId === undefined || existingModeId === null) {
            throw new ChannelModeNotFoundException(mode.publicId);
          }
          modeId = existingModeId;
          await tx
            .update(fixtureChannelMode)
            .set({ name: mode.name, order: index })
            .where(eq(fixtureChannelMode.id, modeId));
        } else {
          const inserted = await tx
            .insert(fixtureChannelMode)
            .values({ fixtureId, name: mode.name, order: index })
            .returning();
          const insertedModeId = inserted[0]?.id;
          if (insertedModeId === undefined || insertedModeId === null) {
            throw new ChannelModeAlreadyExistsException(mode.name);
          }
          modeId = insertedModeId;
        }

        await tx.delete(fixtureChannelAssignment).where(eq(fixtureChannelAssignment.fixtureChannelModeId, modeId));

        if (mode.assignments.length > 0) {
          await tx.insert(fixtureChannelAssignment).values(
            mode.assignments.map((assignment, assignmentIndex) => ({
              fixtureChannelModeId: modeId,
              fixtureChannelDefinitionId: assignment.channelDefinitionId,
              channelNumber: assignmentIndex + 1,
            })),
          );
        }
      }
    });
  }
}
