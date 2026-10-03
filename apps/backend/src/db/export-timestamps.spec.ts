import { describe, expect, it } from 'vitest';
import { mapExportTimestamps } from './export-timestamps';

describe('mapExportTimestamps', () => {
  it('uses the unix epoch when a timestamp is missing', () => {
    expect(mapExportTimestamps({ createdAt: null, updatedAt: null })).toEqual({
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });
  });
});
