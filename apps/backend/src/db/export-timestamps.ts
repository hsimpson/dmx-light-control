export type ExportTimestamps = {
  createdAt: Date;
  updatedAt: Date;
};

export type ExportTimestampSource = {
  createdAt: Date | null;
  updatedAt: Date | null;
};

export function mapExportTimestamps(source: ExportTimestampSource): ExportTimestamps {
  return {
    createdAt: source.createdAt ?? new Date(0),
    updatedAt: source.updatedAt ?? new Date(0),
  };
}
