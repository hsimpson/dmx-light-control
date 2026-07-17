/// <reference types="vitest/globals" />
import { pk, timestamps } from './columns.helpers';

describe('columns.helpers', () => {
  it('exposes a generated identity integer primary key and a random uuid publicId', () => {
    expect(pk.id).toBeDefined();
    expect(pk.publicId).toBeDefined();
  });

  it('exposes createdAt and updatedAt timestamp columns', () => {
    expect(timestamps.createdAt).toBeDefined();
    expect(timestamps.updatedAt).toBeDefined();
  });
});
