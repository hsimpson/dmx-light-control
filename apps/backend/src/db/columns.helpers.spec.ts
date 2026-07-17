/// <reference types="vitest/globals" />
import { pk, timestamps } from './columns.helpers';

describe('columns.helpers', () => {
  it('exposes a generated identity integer primary key and a random uuid publicId', () => {
    expect(pk.id.config.primaryKey).toBe(true);
    expect(pk.id.config.dataType).toBe('number int32');
    expect(pk.id.config.generatedIdentity).toEqual({ type: 'always' });

    expect(pk.publicId.config.dataType).toBe('string uuid');
    expect(pk.publicId.config.hasDefault).toBe(true);
    expect(pk.publicId.config.default).toBeDefined();
  });

  it('exposes createdAt and updatedAt timestamp columns', () => {
    expect(timestamps.createdAt.config.dataType).toBe('object date');
    expect(timestamps.createdAt.config.hasDefault).toBe(true);
    expect(timestamps.updatedAt.config.dataType).toBe('object date');
    expect(timestamps.updatedAt.config.hasDefault).toBe(true);
  });
});
