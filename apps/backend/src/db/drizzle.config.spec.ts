import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db/connection', () => ({
  resolveDatabaseUrl: () => 'postgresql://mock',
}));

describe('drizzle.config', () => {
  it('exports a drizzle-kit config pointing at the schema and migrations dir', async () => {
    const config = (await import('./drizzle.config')).default;
    expect(config.dialect).toBe('postgresql');
    expect(config.schema).toContain('schema.ts');
    expect(config.out).toContain('migrations');
    expect(config.dbCredentials.url).toBe('postgresql://mock');
  });
});
