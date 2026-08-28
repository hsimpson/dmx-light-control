import { describe, expect, it } from 'vitest';
import { mapProjectsToExportDocument } from './project-export.mapper';

const timestamps = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
};

describe('mapProjectsToExportDocument', () => {
  it('maps rows into a versioned document sorted by name', () => {
    expect(
      mapProjectsToExportDocument([
        { publicId: 'b', name: 'Zebra', ...timestamps },
        { publicId: 'a', name: 'Alpha', ...timestamps },
      ]),
    ).toEqual({
      schemaVersion: 1,
      projects: [
        { publicId: 'a', name: 'Alpha', ...timestamps },
        { publicId: 'b', name: 'Zebra', ...timestamps },
      ],
    });
  });
});
