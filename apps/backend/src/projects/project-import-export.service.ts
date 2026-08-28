import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { optionalImportTimestamps } from '@/db/import-timestamps.input';
import { relations } from '@/db/relations';
import { ImportProjectsInput } from '@/projects/dto/import-projects.dto';
import { project } from '@/projects/entities';
import { mapProjectsToExportDocument, ProjectExportDocument } from '@/projects/project-export.mapper';
import { assertImportDocument } from '@/projects/project-import.validator';
import { ProjectImportConflictException } from '@/projects/project.exceptions';
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
  ) {}

  public async exportProjects(): Promise<ProjectExportDocument> {
    const projects = await this.projectRepository.findMany();
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
        .set({ name: incoming.name, ...optionalImportTimestamps(incoming) })
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
        .values({ name: incoming.name, ...optionalPublicId(incoming.publicId), ...optionalImportTimestamps(incoming) })
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

  private async findByPublicId(tx: Tx, publicId: string): Promise<ProjectRow | undefined> {
    const rows = await tx.select().from(project).where(eq(project.publicId, publicId)).limit(1);
    return rows[0];
  }

  private async findByName(tx: Tx, name: string): Promise<ProjectRow | undefined> {
    const rows = await tx.select().from(project).where(eq(project.name, name)).limit(1);
    return rows[0];
  }
}
