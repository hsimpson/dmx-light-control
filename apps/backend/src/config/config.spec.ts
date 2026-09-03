import { overrideProcessEnv } from '@/testhelpers/process-env';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('config', () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    restoreEnv = overrideProcessEnv({
      BACKEND_PORT: '3000',
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

  it('loads the full config from env variables', () => {
    const config = loadConfig();
    expect(config).toEqual({
      port: 3000,
      database: { user: 'u', password: 'p', host: 'h', port: 5432, name: 'db' },
    });
  });

  it('throws when an env variable is missing', () => {
    delete process.env.BACKEND_PORT;
    expect(() => loadConfig()).toThrow('Environment variable BACKEND_PORT is not defined');
  });
});
