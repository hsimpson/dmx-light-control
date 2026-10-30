import { isPostgresUniqueViolation } from '@/db/postgres-errors';
import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable } from '@nestjs/common';
import {
  AddMidiMappingEntryInput,
  CreateMidiMappingInput,
  MidiFeedbackInput,
  MidiLedStateInput,
  UpdateMidiMappingEntryInput,
  UpdateMidiMappingInput,
} from './dto/midi-mapping.dto';
import { MidiFeedback, MidiLedState } from './midi-mapping';
import {
  MidiMappingAlreadyExistsException,
  MidiMappingEntryConflictException,
  MidiMappingEntryNotFoundException,
  MidiMappingInUseException,
  MidiMappingNotFoundException,
} from './midi-mapping.exceptions';
import { MidiMappingEntryRepository } from './repositories/midi-mapping-entry.repository';
import { LoadedMidiMapping, MidiMappingRepository } from './repositories/midi-mapping.repository';

function toMidiMapping({ midiMappingEntries, ...mapping }: LoadedMidiMapping) {
  return { ...mapping, entries: midiMappingEntries };
}

/** GraphQL inputs have a null prototype; DrizzleQueryError stringifies params and throws on them, hiding the pg error. */
function toFeedback(feedback: MidiFeedbackInput | null | undefined): MidiFeedback | null | undefined {
  return (
    feedback && {
      off: toLedState(feedback.off),
      on: toLedState(feedback.on),
      monitor: feedback.monitor ? toLedState(feedback.monitor) : null,
    }
  );
}

function toLedState({ behavior, color }: MidiLedStateInput): MidiLedState {
  return { behavior, color };
}

async function rethrowUniqueViolation<T>(write: Promise<T>, conflict: () => Error): Promise<T> {
  try {
    return await write;
  } catch (error) {
    throw isPostgresUniqueViolation(error) ? conflict() : error;
  }
}

@Injectable()
export class MidiMappingService {
  public constructor(
    private readonly mappingRepository: MidiMappingRepository,
    private readonly entryRepository: MidiMappingEntryRepository,
    private readonly eventEmitter: AppEventEmitter,
  ) {}

  public async getAll() {
    const mappings = await this.mappingRepository.findManyWithEntries();
    return mappings.map(toMidiMapping);
  }

  public async getOne(publicId: string) {
    const mapping = await this.mappingRepository.findOneWithEntries(publicId);
    if (!mapping) {
      throw new MidiMappingNotFoundException(publicId);
    }
    return toMidiMapping(mapping);
  }

  public async create(input: CreateMidiMappingInput) {
    const name = input.name.trim();
    const created = await rethrowUniqueViolation(
      this.mappingRepository.createOne({ name }),
      () => new MidiMappingAlreadyExistsException(name),
    );
    return this.getOne(created?.publicId ?? '');
  }

  public async update(input: UpdateMidiMappingInput) {
    const name = input.name.trim();
    const updated = await rethrowUniqueViolation(
      this.mappingRepository.updateOneByPublicId(input.publicId, { name }),
      () => new MidiMappingAlreadyExistsException(name),
    );
    if (!updated) {
      throw new MidiMappingNotFoundException(input.publicId);
    }
    return this.getOne(input.publicId);
  }

  public async delete(publicId: string) {
    if (await this.mappingRepository.isAssignedToProject(publicId)) {
      throw new MidiMappingInUseException(publicId);
    }
    return { publicId, deleted: await this.mappingRepository.deleteOneByPublicId(publicId) };
  }

  public async addEntry({ midiMappingPublicId, ...input }: AddMidiMappingEntryInput) {
    const mapping = await this.mappingRepository.findOneByPublicId(midiMappingPublicId);
    if (!mapping?.id) {
      throw new MidiMappingNotFoundException(midiMappingPublicId);
    }
    const name = input.name.trim();
    const created = await rethrowUniqueViolation(
      this.entryRepository.createOne({
        ...input,
        name,
        feedback: toFeedback(input.feedback) ?? null,
        midiMappingId: mapping.id,
      }),
      () => new MidiMappingEntryConflictException(name),
    );
    if (!created) {
      throw new MidiMappingEntryNotFoundException(midiMappingPublicId);
    }
    this.eventEmitter.emit('midiMapping.changed');
    return created;
  }

  public async updateEntry({ publicId, name, feedback, ...input }: UpdateMidiMappingEntryInput) {
    const changes = { ...input, name: name?.trim(), feedback: toFeedback(feedback) };
    // Drizzle skips undefined values and throws when nothing is left to set.
    const updated = Object.values(changes).every(value => value === undefined)
      ? await this.entryRepository.findOneByPublicId(publicId)
      : await rethrowUniqueViolation(
          this.entryRepository.updateOneByPublicId(publicId, changes),
          () => new MidiMappingEntryConflictException(changes.name ?? publicId),
        );
    if (!updated) {
      throw new MidiMappingEntryNotFoundException(publicId);
    }
    this.eventEmitter.emit('midiMapping.changed');
    return updated;
  }

  public async deleteEntry(publicId: string) {
    const deleted = await this.entryRepository.deleteOneByPublicId(publicId);
    if (deleted) {
      this.eventEmitter.emit('midiMapping.changed');
    }
    return { publicId, deleted };
  }
}
