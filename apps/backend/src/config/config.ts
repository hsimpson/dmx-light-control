import { Config } from './types/config.types';

function getEnvVariable(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Environment variable ${name} is not defined`);
  }
  return value;
}

export function loadConfig(): Config {
  return {
    port: parseInt(getEnvVariable('BACKEND_PORT'), 10),
    database: {
      user: getEnvVariable('POSTGRES_USER'),
      password: getEnvVariable('POSTGRES_PASSWORD'),
      host: getEnvVariable('POSTGRES_HOST'),
      port: parseInt(getEnvVariable('POSTGRES_PORT'), 10),
      name: getEnvVariable('POSTGRES_DB'),
    },
  };
}
