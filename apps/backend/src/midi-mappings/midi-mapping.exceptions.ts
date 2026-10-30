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

export class MidiMappingInUseException extends BaseDomainError {
  public readonly code = 'MIDI_MAPPING_IN_USE';
  public override readonly statusCode = HttpStatus.CONFLICT;

  public constructor(publicId: string) {
    super(`MIDI mapping with ID ${publicId} is assigned to a project device.`);
    this.name = 'MidiMappingInUseError';
  }
}

export class MidiMappingImportInvalidException extends BaseDomainError {
  public readonly code = 'MIDI_MAPPING_IMPORT_INVALID';
  public override readonly statusCode = HttpStatus.BAD_REQUEST;

  public constructor(message: string) {
    super(message);
    this.name = 'MidiMappingImportInvalidError';
  }
}

export class MidiMappingImportConflictException extends BaseDomainError {
  public readonly code = 'MIDI_MAPPING_IMPORT_CONFLICT';
  public override readonly statusCode = HttpStatus.CONFLICT;

  public constructor(message: string) {
    super(message);
    this.name = 'MidiMappingImportConflictError';
  }
}
