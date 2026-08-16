import { FIXTURE_EXPORT_SCHEMA_VERSION } from '@/fixtures/fixture-export.mapper';
import { FixtureImportInvalidException } from '@/fixtures/fixture.exceptions';

export type ImportAssignmentLike = {
  channelNumber: number;
  channelDefinitionPublicId?: string;
  channelDefinitionName?: string;
};

export type ImportDefinitionLike = {
  publicId?: string;
  name: string;
};

export type ImportFixtureLike = {
  name: string;
  vendor: { name: string };
  channelDefinitions: ImportDefinitionLike[];
  channelModes: { name: string; assignments: ImportAssignmentLike[] }[];
};

export type ImportDocumentLike = {
  schemaVersion: number;
  fixtures: ImportFixtureLike[];
};

export function assertImportDocument(document: ImportDocumentLike): void {
  if (document.schemaVersion !== FIXTURE_EXPORT_SCHEMA_VERSION) {
    throw new FixtureImportInvalidException(
      `Unsupported fixture export schemaVersion ${document.schemaVersion}; expected ${FIXTURE_EXPORT_SCHEMA_VERSION}`,
    );
  }

  for (const fixture of document.fixtures) {
    const definitionsByPublicId = new Map(
      fixture.channelDefinitions.flatMap(definition =>
        definition.publicId ? [[definition.publicId, definition] as const] : [],
      ),
    );
    const definitionsByName = new Map(fixture.channelDefinitions.map(definition => [definition.name, definition]));

    for (const mode of fixture.channelModes) {
      for (const assignment of mode.assignments) {
        const byPublicId = assignment.channelDefinitionPublicId
          ? definitionsByPublicId.get(assignment.channelDefinitionPublicId)
          : undefined;
        const byName = assignment.channelDefinitionName
          ? definitionsByName.get(assignment.channelDefinitionName)
          : undefined;
        if (!byPublicId && !byName) {
          throw new FixtureImportInvalidException(
            `Channel assignment in mode "${mode.name}" on fixture "${fixture.name}" does not match a channel definition in the file`,
          );
        }
      }
    }
  }
}

export function resolveDefinitionRef(
  assignment: ImportAssignmentLike,
  definitionsByPublicId: Map<string, ImportDefinitionLike>,
  definitionsByName: Map<string, ImportDefinitionLike>,
): ImportDefinitionLike | undefined {
  if (assignment.channelDefinitionPublicId) {
    const match = definitionsByPublicId.get(assignment.channelDefinitionPublicId);
    if (match) {
      return match;
    }
  }
  if (assignment.channelDefinitionName) {
    return definitionsByName.get(assignment.channelDefinitionName);
  }
  return undefined;
}
