import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { DRIZZLE_DB_PROVIDER, InjectDb } from './drizzle-db.provider';

describe('drizzle-db.provider', () => {
  it('exposes the provider token', () => {
    expect(DRIZZLE_DB_PROVIDER).toBe('DrizzleDbProvider');
  });

  it('InjectDb is a decorator factory bound to the token', () => {
    expect(typeof InjectDb).toBe('function');
    const decorator = InjectDb();
    expect(typeof decorator).toBe('function');
  });

  it('InjectDb applies the DRIZZLE_DB_PROVIDER token', () => {
    class Test {
      @InjectDb() public db!: unknown;
    }
    const props = Reflect.getMetadata('self:properties_metadata', Test) as unknown as
      { key: string; type: unknown }[] | undefined;
    expect(props?.some(p => p.key === 'db' && p.type === DRIZZLE_DB_PROVIDER)).toBe(true);
  });
});
