import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { mapExportTimestamps } from '@/db/export-timestamps';
import { optionalImportTimestamps } from '@/db/import-timestamps.input';
import { relations } from '@/db/relations';
import { ImportFixturesInput } from '@/fixtures/dto/import-fixtures.dto';
import {
  fixture,
  fixtureChannelAssignment,
  fixtureChannelDefinition,
  fixtureChannelMode,
  fixtureChannelRange,
  fixtureVendor,
} from '@/fixtures/entities';
import { FixtureExportDocument, mapFixturesToExportDocument } from '@/fixtures/fixture-export.mapper';
import { assertImportDocument, resolveDefinitionRef } from '@/fixtures/fixture-import.validator';
import { FixtureImportConflictException, FixtureVendorCreationFailedException } from '@/fixtures/fixture.exceptions';
import { FixtureVendorRepository } from '@/fixtures/repositories/fixture-vendor.repository';
import { FixtureRepository } from '@/fixtures/repositories/fixture.repository';
import { Injectable } from '@nestjs/common';
import { eq, InferSelectModel, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

type Db = NodePgDatabase<typeof relations>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

type VendorRow = InferSelectModel<typeof fixtureVendor>;
type FixtureRow = InferSelectModel<typeof fixture>;
type DefinitionRow = InferSelectModel<typeof fixtureChannelDefinition>;
type ModeRow = InferSelectModel<typeof fixtureChannelMode>;

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

function requireNumericId(id: number | null, context: string): number {
  if (typeof id !== 'number') {
    throw new FixtureImportConflictException(`Missing database id for ${context}`);
  }
  return id;
}

function numericIds(ids: (number | null)[]): number[] {
  return ids.filter((id): id is number => typeof id === 'number');
}

function optionalPublicId(publicId?: string): { publicId: string } | Record<string, never> {
  return publicId ? { publicId } : {};
}

@Injectable()
export class FixtureImportExportService {
  public constructor(
    @InjectDb() private readonly db: Db,
    private readonly fixtureRepository: FixtureRepository,
    private readonly fixtureVendorRepository: FixtureVendorRepository,
  ) {}

  public async exportFixtures(): Promise<FixtureExportDocument> {
    const [fixtures, vendors] = await Promise.all([
      this.fixtureRepository.findMany(),
      this.fixtureVendorRepository.findMany(),
    ]);
    return mapFixturesToExportDocument(
      fixtures,
      vendors.map(vendor => ({
        publicId: vendor.publicId ?? '',
        name: vendor.name,
        ...mapExportTimestamps(vendor),
      })),
    );
  }

  public async importFixtures(document: ImportFixturesInput): Promise<{
    importedCount: number;
    fixtures: InferSelectModel<typeof fixture>[];
  }> {
    assertImportDocument(document);

    const importedPublicIds = await this.db.transaction(async tx => {
      for (const incoming of document.vendors ?? []) {
        await this.upsertVendor(tx, incoming);
      }

      const publicIds: string[] = [];
      for (const incoming of document.fixtures) {
        const vendor = await this.upsertVendor(tx, incoming.vendor);
        const fixtureRow = await this.upsertFixture(tx, incoming, vendor);
        const definitionIdByKey = await this.replaceDefinitions(tx, fixtureRow, incoming.channelDefinitions);
        await this.replaceModes(tx, fixtureRow, incoming.channelModes, incoming.channelDefinitions, definitionIdByKey);
        publicIds.push(fixtureRow.publicId ?? incoming.publicId ?? incoming.name);
      }
      return publicIds;
    });

    const fixtures = await this.fixtureRepository.findMany();
    const imported = new Set(importedPublicIds);
    return {
      importedCount: importedPublicIds.length,
      fixtures: fixtures.filter(row => row.publicId !== null && imported.has(row.publicId)),
    };
  }

  private async upsertVendor(tx: Tx, incoming: ImportFixturesInput['fixtures'][number]['vendor']): Promise<VendorRow> {
    const byName = await this.findVendorByName(tx, incoming.name);
    if (byName) {
      return byName;
    }

    if (incoming.publicId) {
      const byPublicId = await this.findVendorByPublicId(tx, incoming.publicId);
      if (byPublicId) {
        return byPublicId;
      }
    }

    const inserted = await tx
      .insert(fixtureVendor)
      .values({ name: incoming.name, ...optionalPublicId(incoming.publicId), ...optionalImportTimestamps(incoming) })
      .returning();
    const vendor = inserted[0];
    if (!vendor) {
      throw new FixtureVendorCreationFailedException(incoming.name);
    }
    return vendor;
  }

  private async upsertFixture(
    tx: Tx,
    incoming: ImportFixturesInput['fixtures'][number],
    vendor: VendorRow,
  ): Promise<FixtureRow> {
    if (vendor.id === null) {
      throw new FixtureVendorCreationFailedException(vendor.name);
    }

    const byPublicId = incoming.publicId ? await this.findFixtureByPublicId(tx, incoming.publicId) : undefined;
    const byName = await this.findFixtureByName(tx, incoming.name);

    if (byPublicId && byName && byPublicId.id !== byName.id) {
      throw new FixtureImportConflictException(
        `Fixture publicId ${incoming.publicId} and name "${incoming.name}" match different fixtures`,
      );
    }

    const existing = byPublicId ?? byName;
    if (existing) {
      const updated = await tx
        .update(fixture)
        .set({ name: incoming.name, vendorId: vendor.id, ...optionalImportTimestamps(incoming) })
        .where(eq(fixture.id, requireNumericId(existing.id, incoming.name)))
        .returning();
      const row = updated[0];
      if (!row) {
        throw new FixtureImportConflictException(`Failed to update fixture "${incoming.name}"`);
      }
      return row;
    }

    try {
      const inserted = await tx
        .insert(fixture)
        .values({
          name: incoming.name,
          vendorId: vendor.id,
          ...optionalPublicId(incoming.publicId),
          ...optionalImportTimestamps(incoming),
        })
        .returning();
      const row = inserted[0];
      if (!row) {
        throw new FixtureImportConflictException(`Failed to create fixture "${incoming.name}"`);
      }
      return row;
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new FixtureImportConflictException(`Fixture "${incoming.name}" already exists`);
      }
      throw error;
    }
  }

  private async replaceDefinitions(
    tx: Tx,
    fixtureRow: FixtureRow,
    incomingDefinitions: ImportFixturesInput['fixtures'][number]['channelDefinitions'],
  ): Promise<Map<string, number>> {
    const existing = await tx
      .select()
      .from(fixtureChannelDefinition)
      .where(eq(fixtureChannelDefinition.fixtureId, requireNumericId(fixtureRow.id, fixtureRow.name)));
    const byPublicId = new Map(existing.flatMap(row => (row.publicId ? [[row.publicId, row] as const] : [])));
    const byName = new Map(existing.map(row => [row.name, row]));
    const keptIds = new Set<number>();
    const definitionIdByKey = new Map<string, number>();

    for (const incoming of incomingDefinitions) {
      const matched = this.matchChild(incoming, byPublicId, byName);
      const definitionId = await this.upsertDefinition(
        tx,
        requireNumericId(fixtureRow.id, fixtureRow.name),
        incoming,
        matched,
      );
      keptIds.add(definitionId);
      if (incoming.publicId) {
        definitionIdByKey.set(`id:${incoming.publicId}`, definitionId);
      }
      definitionIdByKey.set(`name:${incoming.name}`, definitionId);
      await this.replaceRanges(tx, definitionId, incoming.ranges);
    }

    const toDelete = numericIds(existing.map(row => row.id)).filter(id => !keptIds.has(id));
    if (toDelete.length > 0) {
      await tx.delete(fixtureChannelDefinition).where(inArray(fixtureChannelDefinition.id, toDelete));
    }

    return definitionIdByKey;
  }

  private async upsertDefinition(
    tx: Tx,
    fixtureId: number,
    incoming: ImportFixturesInput['fixtures'][number]['channelDefinitions'][number],
    existing: DefinitionRow | undefined,
  ): Promise<number> {
    if (existing) {
      await tx
        .update(fixtureChannelDefinition)
        .set({
          name: incoming.name,
          order: incoming.order,
          preset: incoming.preset,
          ...optionalImportTimestamps(incoming),
        })
        .where(eq(fixtureChannelDefinition.id, requireNumericId(existing.id, incoming.name)));
      return requireNumericId(existing.id, incoming.name);
    }

    try {
      const inserted = await tx
        .insert(fixtureChannelDefinition)
        .values({
          fixtureId,
          name: incoming.name,
          order: incoming.order,
          preset: incoming.preset,
          ...optionalPublicId(incoming.publicId),
          ...optionalImportTimestamps(incoming),
        })
        .returning();
      const row = inserted[0];
      if (!row) {
        throw new FixtureImportConflictException(`Failed to create channel definition "${incoming.name}"`);
      }
      return requireNumericId(row.id, incoming.name);
    } catch (error) {
      if (error instanceof FixtureImportConflictException) {
        throw error;
      }
      if (isPostgresUniqueViolation(error)) {
        throw new FixtureImportConflictException(`Channel definition "${incoming.name}" already exists`);
      }
      throw error;
    }
  }

  private async replaceRanges(
    tx: Tx,
    definitionId: number,
    ranges: ImportFixturesInput['fixtures'][number]['channelDefinitions'][number]['ranges'],
  ): Promise<void> {
    await tx.delete(fixtureChannelRange).where(eq(fixtureChannelRange.fixtureChannelDefinitionId, definitionId));
    if (ranges.length === 0) {
      return;
    }
    await tx.insert(fixtureChannelRange).values(
      ranges.map(range => ({
        fixtureChannelDefinitionId: definitionId,
        dmxStart: range.dmxStart,
        dmxEnd: range.dmxEnd,
        description: range.description,
        ...optionalPublicId(range.publicId),
        ...optionalImportTimestamps(range),
      })),
    );
  }

  private async replaceModes(
    tx: Tx,
    fixtureRow: FixtureRow,
    incomingModes: ImportFixturesInput['fixtures'][number]['channelModes'],
    incomingDefinitions: ImportFixturesInput['fixtures'][number]['channelDefinitions'],
    definitionIdByKey: Map<string, number>,
  ): Promise<void> {
    const existing = await tx
      .select()
      .from(fixtureChannelMode)
      .where(eq(fixtureChannelMode.fixtureId, requireNumericId(fixtureRow.id, fixtureRow.name)));
    const byPublicId = new Map(existing.flatMap(row => (row.publicId ? [[row.publicId, row] as const] : [])));
    const byName = new Map(existing.map(row => [row.name, row]));
    const keptIds = new Set<number>();

    const definitionsByPublicId = new Map(
      incomingDefinitions.flatMap(definition =>
        definition.publicId ? [[definition.publicId, definition] as const] : [],
      ),
    );
    const definitionsByName = new Map(incomingDefinitions.map(definition => [definition.name, definition]));

    for (const incoming of incomingModes) {
      const matched = this.matchChild(incoming, byPublicId, byName);
      const modeId = await this.upsertMode(tx, requireNumericId(fixtureRow.id, fixtureRow.name), incoming, matched);
      keptIds.add(modeId);

      await tx.delete(fixtureChannelAssignment).where(eq(fixtureChannelAssignment.fixtureChannelModeId, modeId));
      if (incoming.assignments.length === 0) {
        continue;
      }

      await tx.insert(fixtureChannelAssignment).values(
        incoming.assignments.map(assignment => {
          const definition = resolveDefinitionRef(assignment, definitionsByPublicId, definitionsByName);
          const definitionId =
            (definition?.publicId ? definitionIdByKey.get(`id:${definition.publicId}`) : undefined) ??
            (definition ? definitionIdByKey.get(`name:${definition.name}`) : undefined);
          if (definitionId === undefined) {
            throw new FixtureImportConflictException(
              `Channel assignment in mode "${incoming.name}" does not match a channel definition`,
            );
          }
          return {
            fixtureChannelModeId: modeId,
            fixtureChannelDefinitionId: definitionId,
            channelNumber: assignment.channelNumber,
            ...optionalImportTimestamps(assignment),
          };
        }),
      );
    }

    const toDelete = numericIds(existing.map(row => row.id)).filter(id => !keptIds.has(id));
    if (toDelete.length > 0) {
      await tx.delete(fixtureChannelMode).where(inArray(fixtureChannelMode.id, toDelete));
    }
  }

  private async upsertMode(
    tx: Tx,
    fixtureId: number,
    incoming: ImportFixturesInput['fixtures'][number]['channelModes'][number],
    existing: ModeRow | undefined,
  ): Promise<number> {
    if (existing) {
      await tx
        .update(fixtureChannelMode)
        .set({ name: incoming.name, order: incoming.order, ...optionalImportTimestamps(incoming) })
        .where(eq(fixtureChannelMode.id, requireNumericId(existing.id, incoming.name)));
      return requireNumericId(existing.id, incoming.name);
    }

    const inserted = await tx
      .insert(fixtureChannelMode)
      .values({
        fixtureId,
        name: incoming.name,
        order: incoming.order,
        ...optionalPublicId(incoming.publicId),
        ...optionalImportTimestamps(incoming),
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new FixtureImportConflictException(`Failed to create channel mode "${incoming.name}"`);
    }
    return requireNumericId(row.id, incoming.name);
  }

  private matchChild<T extends { publicId: string | null; name: string }>(
    incoming: { publicId?: string; name: string },
    byPublicId: Map<string, T>,
    byName: Map<string, T>,
  ): T | undefined {
    const byId = incoming.publicId ? byPublicId.get(incoming.publicId) : undefined;
    const byChildName = byName.get(incoming.name);
    if (byId && byChildName && byId !== byChildName) {
      throw new FixtureImportConflictException(
        `publicId ${incoming.publicId} and name "${incoming.name}" match different records`,
      );
    }
    return byId ?? byChildName;
  }

  private async findVendorByName(tx: Tx, name: string): Promise<VendorRow | undefined> {
    const rows = await tx.select().from(fixtureVendor).where(eq(fixtureVendor.name, name)).limit(1);
    return rows[0];
  }

  private async findVendorByPublicId(tx: Tx, publicId: string): Promise<VendorRow | undefined> {
    const rows = await tx.select().from(fixtureVendor).where(eq(fixtureVendor.publicId, publicId)).limit(1);
    return rows[0];
  }

  private async findFixtureByPublicId(tx: Tx, publicId: string): Promise<FixtureRow | undefined> {
    const rows = await tx.select().from(fixture).where(eq(fixture.publicId, publicId)).limit(1);
    return rows[0];
  }

  private async findFixtureByName(tx: Tx, name: string): Promise<FixtureRow | undefined> {
    const rows = await tx.select().from(fixture).where(eq(fixture.name, name)).limit(1);
    return rows[0];
  }
}
