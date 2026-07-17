/// <reference types="vitest/globals" />
describe('connection', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      POSTGRES_USER: 'u',
      POSTGRES_PASSWORD: 'p',
      POSTGRES_HOST: 'h',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'db',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('builds a postgres url from env vars', async () => {
    const { resolveDatabaseUrl } = await import('./connection');
    expect(resolveDatabaseUrl()).toBe('postgresql://u:p@h:5432/db');
  });
});
