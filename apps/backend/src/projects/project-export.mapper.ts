export const PROJECT_EXPORT_SCHEMA_VERSION = 1;

export type ProjectExportProject = {
  publicId: string;
  name: string;
};

export type ProjectExportDocument = {
  schemaVersion: number;
  projects: ProjectExportProject[];
};

export type ProjectExportSource = {
  publicId: string | null;
  name: string;
};

export function mapProjectsToExportDocument(projects: ProjectExportSource[]): ProjectExportDocument {
  return {
    schemaVersion: PROJECT_EXPORT_SCHEMA_VERSION,
    projects: [...projects]
      .map(project => ({
        publicId: project.publicId ?? '',
        name: project.name,
      }))
      .sort((left, right) => left.name.localeCompare(right.name) || left.publicId.localeCompare(right.publicId)),
  };
}
