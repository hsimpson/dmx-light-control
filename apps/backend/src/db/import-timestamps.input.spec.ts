import { describe, expect, it } from 'vitest';
import { optionalImportTimestamps } from './import-timestamps.input';

describe('optionalImportTimestamps', () => {
  it('copies createdAt only when the import provides it', () => {
    const createdAt = new Date('2020-01-01T00:00:00.000Z');
    expect(optionalImportTimestamps({ createdAt })).toEqual({ createdAt });
    expect(optionalImportTimestamps({})).toEqual({});
  });
});
