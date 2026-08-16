import { describe, expect, it } from 'vitest';
import { mapProjectsToExportDocument } from './project-export.mapper';

describe('mapProjectsToExportDocument', () => {
  it('maps rows into a versioned document sorted by name', () => {
    expect(
      mapProjectsToExportDocument([
        { publicId: 'b', name: 'Zebra' },
        { publicId: 'a', name: 'Alpha' },
      ]),
    ).toEqual({
      schemaVersion: 1,
      projects: [
        { publicId: 'a', name: 'Alpha' },
        { publicId: 'b', name: 'Zebra' },
      ],
    });
  });
});
