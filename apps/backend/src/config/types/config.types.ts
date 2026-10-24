import { LogLevel } from '@nestjs/common';

export type DatabaseConfig = {
  user: string;
  password: string;
  host: string;
  port: number;
  name: string;
};

export type Config = {
  port: number;
  logLevels: LogLevel[];
  database: DatabaseConfig;
};
