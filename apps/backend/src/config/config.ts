import { LOG_LEVELS, LogLevel } from '@nestjs/common';
import { Config } from './types/config.types';

function getEnvVariable(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Environment variable ${name} is not defined`);
  }
  return value;
}

function loadLogLevels(): LogLevel[] {
  const value = process.env.LOG_LEVEL ?? 'log';
  const index = LOG_LEVELS.findIndex(level => level === value);
  if (index === -1) {
    throw new Error(`Environment variable LOG_LEVEL must be one of ${LOG_LEVELS.join(', ')}`);
  }
  return LOG_LEVELS.slice(index);
}

export function loadConfig(): Config {
  return {
    port: parseInt(getEnvVariable('BACKEND_PORT'), 10),
    logLevels: loadLogLevels(),
    database: {
      user: getEnvVariable('POSTGRES_USER'),
      password: getEnvVariable('POSTGRES_PASSWORD'),
      host: getEnvVariable('POSTGRES_HOST'),
      port: parseInt(getEnvVariable('POSTGRES_PORT'), 10),
      name: getEnvVariable('POSTGRES_DB'),
    },
  };
}
