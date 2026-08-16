import { PROJECT_EXPORT_SCHEMA_VERSION } from '@/projects/project-export.mapper';
import { ProjectImportInvalidException } from '@/projects/project.exceptions';

export type ImportProjectsDocumentLike = {
  schemaVersion: number;
};

export function assertImportDocument(document: ImportProjectsDocumentLike): void {
  if (document.schemaVersion !== PROJECT_EXPORT_SCHEMA_VERSION) {
    throw new ProjectImportInvalidException(
      `Unsupported project export schemaVersion ${document.schemaVersion}; expected ${PROJECT_EXPORT_SCHEMA_VERSION}`,
    );
  }
}
