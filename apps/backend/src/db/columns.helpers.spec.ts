import { describe, expect, it } from 'vitest';
import { pk, timestamps } from './columns.helpers';

type ColumnWithConfig = { config: Record<string, unknown> };

const configOf = (column: unknown): Record<string, unknown> => (column as ColumnWithConfig).config;

describe('columns.helpers', () => {
  it('exposes a generated identity integer primary key and a random uuid publicId', () => {
    expect(configOf(pk.id).primaryKey).toBe(true);
    expect(configOf(pk.id).dataType).toBe('number int32');
    expect(configOf(pk.id).generatedIdentity).toEqual({ type: 'always' });

    expect(configOf(pk.publicId).dataType).toBe('string uuid');
    expect(configOf(pk.publicId).hasDefault).toBe(true);
    expect(configOf(pk.publicId).default).toBeDefined();
  });

  it('exposes createdAt and updatedAt timestamp columns', () => {
    expect(configOf(timestamps.createdAt).dataType).toBe('object date');
    expect(configOf(timestamps.createdAt).hasDefault).toBe(true);
    expect(configOf(timestamps.updatedAt).dataType).toBe('object date');
    expect(configOf(timestamps.updatedAt).hasDefault).toBe(true);
  });

  it('updatedAt.onUpdateFn returns a fresh Date on update', () => {
    const onUpdateFn = (timestamps.updatedAt as unknown as { config: { onUpdateFn?: () => Date } }).config.onUpdateFn;
    expect(typeof onUpdateFn).toBe('function');
    const result = onUpdateFn?.();
    expect(result).toBeInstanceOf(Date);
  });
});
