import { overrideProcessEnv } from '@/testhelpers/process-env';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('connection', () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    restoreEnv = overrideProcessEnv({
      POSTGRES_USER: 'u',
      POSTGRES_PASSWORD: 'p',
      POSTGRES_HOST: 'h',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'db',
    });
  });

  afterEach(() => {
    restoreEnv();
  });

  it('builds a postgres url from env vars', async () => {
    const { resolveDatabaseUrl } = await import('./connection');
    expect(resolveDatabaseUrl()).toBe('postgresql://u:p@h:5432/db');
  });
});
