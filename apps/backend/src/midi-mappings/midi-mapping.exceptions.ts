import { BaseDomainError } from '@/fixtures/fixture.exceptions';
import { HttpStatus } from '@nestjs/common';

export class MidiMappingNotFoundException extends BaseDomainError {
  public readonly code = 'MIDI_MAPPING_NOT_FOUND';
  public override readonly statusCode = HttpStatus.NOT_FOUND;

  public constructor(publicId: string) {
    super(`MIDI mapping with ID ${publicId} could not be found.`);
    this.name = 'MidiMappingNotFoundError';
  }
}

export class MidiMappingAlreadyExistsException extends BaseDomainError {
  public readonly code = 'MIDI_MAPPING_ALREADY_EXISTS';
  public override readonly statusCode = HttpStatus.CONFLICT;

  public constructor(name: string) {
    super(`MIDI mapping with name ${name} already exists.`);
    this.name = 'MidiMappingAlreadyExistsError';
  }
}

export class MidiMappingEntryNotFoundException extends BaseDomainError {
  public readonly code = 'MIDI_MAPPING_ENTRY_NOT_FOUND';
  public override readonly statusCode = HttpStatus.NOT_FOUND;

  public constructor(publicId: string) {
    super(`MIDI mapping entry with ID ${publicId} could not be found.`);
    this.name = 'MidiMappingEntryNotFoundError';
  }
}

export class MidiMappingEntryConflictException extends BaseDomainError {
  public readonly code = 'MIDI_MAPPING_ENTRY_CONFLICT';
  public override readonly statusCode = HttpStatus.CONFLICT;

  public constructor(name: string) {
    super(`MIDI mapping entry ${name} reuses a name or MIDI address that already exists in this mapping.`);
    this.name = 'MidiMappingEntryConflictError';
  }
}
