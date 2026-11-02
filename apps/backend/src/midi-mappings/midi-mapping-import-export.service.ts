import { InjectDb } from '@/db/drizzle-db/drizzle-db.provider';
import { optionalImportTimestamps } from '@/db/import-timestamps.input';
import { isPostgresUniqueViolation } from '@/db/postgres-errors';
import { relations } from '@/db/relations';
import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable } from '@nestjs/common';
import { eq, InferSelectModel } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ImportMidiMappingInput, ImportMidiMappingsInput } from './dto/midi-mapping-import-export.dto';
import { midiMapping, midiMappingEntry } from './entities';
import { MidiMappingImportConflictException, MidiMappingImportInvalidException } from './midi-mapping.exceptions';
import { MidiMappingService, toFeedback, toLedPalettes } from './midi-mapping.service';

export const MIDI_MAPPING_EXPORT_SCHEMA_VERSION = 1;

type Db = NodePgDatabase<typeof relations>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type MappingRow = InferSelectModel<typeof midiMapping>;

/** Catalog file round-trip: upsert mappings by publicId or name, replace their entries, keep publicIds. */
@Injectable()
export class MidiMappingImportExportService {
  public constructor(
    @InjectDb() private readonly db: Db,
    private readonly mappingService: MidiMappingService,
    private readonly eventEmitter: AppEventEmitter,
  ) {}

  public async exportMappings() {
    return { schemaVersion: MIDI_MAPPING_EXPORT_SCHEMA_VERSION, mappings: await this.mappingService.getAll() };
  }

  public async importMappings(document: ImportMidiMappingsInput) {
    if (document.schemaVersion !== MIDI_MAPPING_EXPORT_SCHEMA_VERSION) {
      throw new MidiMappingImportInvalidException(
        `Unsupported MIDI mapping export schemaVersion ${document.schemaVersion}; expected ${MIDI_MAPPING_EXPORT_SCHEMA_VERSION}`,
      );
    }
    let publicIds: string[];
    try {
      publicIds = await this.db.transaction(async tx => {
        const imported: string[] = [];
        for (const incoming of document.mappings) {
          imported.push(await this.importMapping(tx, incoming));
        }
        return imported;
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new MidiMappingImportConflictException(
          'A mapping reuses a name, MIDI address or publicId already in use',
        );
      }
      throw error;
    }
    this.eventEmitter.emit('midiMapping.changed');
    const imported = new Set(publicIds);
    const mappings = (await this.mappingService.getAll()).filter(mapping => imported.has(mapping.publicId ?? ''));
    return { importedCount: publicIds.length, mappings };
  }

  private async importMapping(tx: Tx, incoming: ImportMidiMappingInput): Promise<string> {
    const row = await this.upsertMapping(tx, incoming);
    const mappingId = row.id;
    if (mappingId === null || row.publicId === null) {
      throw new MidiMappingImportConflictException(`Failed to import MIDI mapping "${incoming.name}"`);
    }
    await tx.delete(midiMappingEntry).where(eq(midiMappingEntry.midiMappingId, mappingId));
    if (incoming.entries.length > 0) {
      await tx.insert(midiMappingEntry).values(
        incoming.entries.map(
          ({ publicId, name, controlType, messageType, channel, number, feedback, ledType, ...rest }) => ({
            ...(publicId ? { publicId } : {}),
            ...optionalImportTimestamps(rest),
            midiMappingId: mappingId,
            name: name.trim(),
            controlType,
            messageType,
            channel,
            number,
            feedback: toFeedback(feedback) ?? null,
            ledType: ledType ?? null,
          }),
        ),
      );
    }
    return row.publicId;
  }

  private async upsertMapping(tx: Tx, incoming: ImportMidiMappingInput): Promise<MappingRow> {
    const name = incoming.name.trim();
    const byPublicId = incoming.publicId
      ? await tx.query.midiMapping.findFirst({ where: { publicId: incoming.publicId } })
      : undefined;
    const byName = await tx.query.midiMapping.findFirst({ where: { name } });
    if (byPublicId && byName && byPublicId.id !== byName.id) {
      throw new MidiMappingImportConflictException(
        `MIDI mapping publicId ${incoming.publicId} and name "${name}" match different mappings`,
      );
    }
    const existing = byPublicId ?? byName;
    const values = {
      name,
      ...optionalImportTimestamps(incoming),
      ...(incoming.ledPalettes ? { ledPalettes: toLedPalettes(incoming.ledPalettes) } : {}),
    };
    const [row] = existing?.id
      ? await tx.update(midiMapping).set(values).where(eq(midiMapping.id, existing.id)).returning()
      : await tx
          .insert(midiMapping)
          .values({ ...values, ...(incoming.publicId ? { publicId: incoming.publicId } : {}) })
          .returning();
    if (!row) {
      throw new MidiMappingImportConflictException(`Failed to import MIDI mapping "${name}"`);
    }
    return row;
  }
}
