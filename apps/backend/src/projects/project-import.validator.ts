import { PROJECT_EXPORT_SCHEMA_VERSION } from '@/projects/project-export.mapper';
import { ProjectImportInvalidException } from '@/projects/project.exceptions';

export type ImportProjectsDocumentLike = {
  schemaVersion: number;
};

const SUPPORTED_SCHEMA_VERSIONS = [1, 2, PROJECT_EXPORT_SCHEMA_VERSION] as const;

export function assertImportDocument(document: ImportProjectsDocumentLike): void {
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(document.schemaVersion as (typeof SUPPORTED_SCHEMA_VERSIONS)[number])) {
    throw new ProjectImportInvalidException(
      `Unsupported project export schemaVersion ${document.schemaVersion}; expected ${SUPPORTED_SCHEMA_VERSIONS.join(' or ')}`,
    );
  }
}
