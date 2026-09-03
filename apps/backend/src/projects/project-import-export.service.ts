import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { optionalImportTimestamps } from '@/db/import-timestamps.input';
import { relations } from '@/db/relations';
import { fixture, fixtureChannelMode } from '@/fixtures/entities';
import { ImportProjectsInput } from '@/projects/dto/import-projects.dto';
import { project, projectFixture } from '@/projects/entities';
import { mapProjectsToExportDocument, ProjectExportDocument } from '@/projects/project-export.mapper';
import { assertImportDocument } from '@/projects/project-import.validator';
import {
  assertChannelModeBelongsToFixture,
  assertNoPatchOverlap,
  assertValidPatchAddress,
  channelCountFromMode,
  OccupiedPatch,
} from '@/projects/project-fixture.validation';
import { optionalRoomDimensions } from '@/projects/project-room-dimensions';
import { ProjectImportConflictException } from '@/projects/project.exceptions';
import { ProjectFixtureRepository } from '@/projects/repositories/project-fixture.repository';
import { ProjectRepository } from '@/projects/repositories/project.repository';
import { Injectable } from '@nestjs/common';
import { eq, InferSelectModel } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

type Db = NodePgDatabase<typeof relations>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type ProjectRow = InferSelectModel<typeof project>;

function getErrorCode(error: unknown): unknown {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return error.code;
}

function isPostgresUniqueViolation(error: unknown): boolean {
  if (getErrorCode(error) === '23505') {
    return true;
  }
  if (typeof error === 'object' && error !== null && 'cause' in error) {
    return getErrorCode(error.cause) === '23505';
  }
  return false;
}

function optionalPublicId(publicId?: string): { publicId: string } | Record<string, never> {
  return publicId ? { publicId } : {};
}

@Injectable()
export class ProjectImportExportService {
  public constructor(
    @InjectDb() private readonly db: Db,
    private readonly projectRepository: ProjectRepository,
    private readonly projectFixtureRepository: ProjectFixtureRepository,
  ) {}

  public async exportProjects(): Promise<ProjectExportDocument> {
    const projects = await this.projectRepository.findManyWithFixtures();
    return mapProjectsToExportDocument(projects);
  }

  public async importProjects(document: ImportProjectsInput): Promise<{
    importedCount: number;
    projects: ProjectRow[];
  }> {
    assertImportDocument(document);

    const importedPublicIds = await this.db.transaction(async tx => {
      const publicIds: string[] = [];
      for (const incoming of document.projects) {
        const row = await this.upsertProject(tx, incoming);
        await this.replaceProjectFixtures(tx, row, incoming);
        publicIds.push(row.publicId ?? incoming.publicId ?? incoming.name);
      }
      return publicIds;
    });

    const projects = await this.projectRepository.findMany();
    const imported = new Set(importedPublicIds);
    return {
      importedCount: importedPublicIds.length,
      projects: projects.filter(row => row.publicId !== null && imported.has(row.publicId)),
    };
  }

  private async upsertProject(tx: Tx, incoming: ImportProjectsInput['projects'][number]): Promise<ProjectRow> {
    const byPublicId = incoming.publicId ? await this.findByPublicId(tx, incoming.publicId) : undefined;
    const byName = await this.findByName(tx, incoming.name);

    if (byPublicId && byName && byPublicId.id !== byName.id) {
      throw new ProjectImportConflictException(
        `Project publicId ${incoming.publicId} and name "${incoming.name}" match different projects`,
      );
    }

    const existing = byPublicId ?? byName;
    if (existing) {
      const existingId = existing.id;
      if (existingId === null) {
        throw new ProjectImportConflictException(`Failed to update project "${incoming.name}"`);
      }
      const updated = await tx
        .update(project)
        .set({ name: incoming.name, ...optionalRoomDimensions(incoming), ...optionalImportTimestamps(incoming) })
        .where(eq(project.id, existingId))
        .returning();
      const row = updated[0];
      if (!row) {
        throw new ProjectImportConflictException(`Failed to update project "${incoming.name}"`);
      }
      return row;
    }

    try {
      const inserted = await tx
        .insert(project)
        .values({
          name: incoming.name,
          ...optionalPublicId(incoming.publicId),
          ...optionalRoomDimensions(incoming),
          ...optionalImportTimestamps(incoming),
        })
        .returning();
      const row = inserted[0];
      if (!row) {
        throw new ProjectImportConflictException(`Failed to create project "${incoming.name}"`);
      }
      return row;
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ProjectImportConflictException(`Project "${incoming.name}" already exists`);
      }
      throw error;
    }
  }

  private async replaceProjectFixtures(
    tx: Tx,
    projectRow: ProjectRow,
    incoming: ImportProjectsInput['projects'][number],
  ): Promise<void> {
    const projectId = projectRow.id;
    if (projectId === null) {
      throw new ProjectImportConflictException(`Failed to import fixtures for project "${incoming.name}"`);
    }

    await tx.delete(projectFixture).where(eq(projectFixture.projectId, projectId));

    const instances = incoming.projectFixtures ?? [];
    const occupied: OccupiedPatch[] = [];
    for (const instance of instances) {
      const fixtureRow = await this.findFixtureByPublicId(tx, instance.fixturePublicId);
      if (!fixtureRow?.id) {
        throw new ProjectImportConflictException(
          `Fixture publicId ${instance.fixturePublicId} not found for project "${incoming.name}"`,
        );
      }

      const modeRow = await this.findChannelModeByPublicId(tx, instance.channelModePublicId);
      if (!modeRow?.id) {
        throw new ProjectImportConflictException(
          `Channel mode publicId ${instance.channelModePublicId} not found for project "${incoming.name}"`,
        );
      }

      const modeWithAssignments = await tx.query.fixtureChannelMode.findFirst({
        where: { id: modeRow.id },
        with: { fixtureChannelAssignments: true },
      });
      if (!modeWithAssignments) {
        throw new ProjectImportConflictException(
          `Channel mode publicId ${instance.channelModePublicId} not found for project "${incoming.name}"`,
        );
      }

      assertChannelModeBelongsToFixture(modeWithAssignments, fixtureRow.id);
      assertValidPatchAddress(instance.startAddress, modeWithAssignments);
      const channelCount = channelCountFromMode(modeWithAssignments);
      assertNoPatchOverlap(instance.startAddress, channelCount, occupied);
      occupied.push({ startAddress: instance.startAddress, channelCount });

      await tx.insert(projectFixture).values({
        projectId,
        fixtureId: fixtureRow.id,
        fixtureChannelModeId: modeRow.id,
        startAddress: instance.startAddress,
        ...optionalPublicId(instance.publicId),
        ...optionalImportTimestamps(instance),
      });
    }
  }

  private async findByPublicId(tx: Tx, publicId: string): Promise<ProjectRow | undefined> {
    const rows = await tx.select().from(project).where(eq(project.publicId, publicId)).limit(1);
    return rows[0];
  }

  private async findByName(tx: Tx, name: string): Promise<ProjectRow | undefined> {
    const rows = await tx.select().from(project).where(eq(project.name, name)).limit(1);
    return rows[0];
  }

  private async findFixtureByPublicId(tx: Tx, publicId: string) {
    const rows = await tx.select().from(fixture).where(eq(fixture.publicId, publicId)).limit(1);
    return rows[0];
  }

  private async findChannelModeByPublicId(tx: Tx, publicId: string) {
    const rows = await tx.select().from(fixtureChannelMode).where(eq(fixtureChannelMode.publicId, publicId)).limit(1);
    return rows[0];
  }
}
