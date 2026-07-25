import { describe, expect, it } from 'vitest';
import { DrizzleDbModule } from './drizzle-db.module';

describe('DrizzleDbModule', () => {
  it('forRoot returns a dynamic module exporting the db provider', () => {
    const mod = DrizzleDbModule.forRoot({ url: 'postgresql://x', relations: {} as never });
    // NOTE: the module is marked @Global() at the class level; the returned
    // DynamicModule object does NOT carry a `global` property, so we do not
    // assert mod.global here.
    expect(mod.module).toBe(DrizzleDbModule);
    expect(mod.providers).toHaveLength(1);
    expect(mod.exports).toHaveLength(1);

    const provider = (mod.providers ?? [])[0] as { provide: string; useFactory: () => unknown };
    expect(provider.provide).toBe('DrizzleDbProvider');
    // useFactory returns a drizzle instance (we just assert it is defined/object)
    expect(provider.useFactory()).toBeDefined();
  });
});
