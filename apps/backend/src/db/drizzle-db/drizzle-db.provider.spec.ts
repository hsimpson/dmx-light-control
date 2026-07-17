/// <reference types="vitest/globals" />
import { InjectDb, DRIZZLE_DB_PROVIDER } from './drizzle-db.provider';

describe('drizzle-db.provider', () => {
  it('exposes the provider token', () => {
    expect(DRIZZLE_DB_PROVIDER).toBe('DrizzleDbProvider');
  });

  it('InjectDb is a decorator factory bound to the token', () => {
    expect(typeof InjectDb).toBe('function');
    const decorator = InjectDb();
    expect(typeof decorator).toBe('function');
  });
});
