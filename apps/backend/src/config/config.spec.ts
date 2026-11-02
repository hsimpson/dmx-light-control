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
      LOG_LEVEL: 'warn',
    });
  });

  afterEach(() => {
    restoreEnv();
  });

  it('loads the full config from env variables', () => {
    const config = loadConfig();
    expect(config).toEqual({
      port: 3000,
      logLevels: ['warn', 'error', 'fatal'],
      database: { user: 'u', password: 'p', host: 'h', port: 5432, name: 'db' },
    });
  });

  it('enables the given log level and all more severe ones', () => {
    process.env.LOG_LEVEL = 'debug';
    expect(loadConfig().logLevels).toEqual(['debug', 'log', 'warn', 'error', 'fatal']);
  });

  it('defaults the log level to log when LOG_LEVEL is not set', () => {
    delete process.env.LOG_LEVEL;
    expect(loadConfig().logLevels).toEqual(['log', 'warn', 'error', 'fatal']);
  });

  it('throws when the log level is unknown', () => {
    process.env.LOG_LEVEL = 'info';
    expect(() => loadConfig()).toThrow(
      'Environment variable LOG_LEVEL must be one of verbose, debug, log, warn, error, fatal',
    );
  });

  it('throws when an env variable is missing', () => {
    delete process.env.BACKEND_PORT;
    expect(() => loadConfig()).toThrow('Environment variable BACKEND_PORT is not defined');
  });
});
