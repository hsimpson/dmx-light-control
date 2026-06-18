import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { DefaultLogger } from 'drizzle-orm/logger';
import { drizzle } from 'drizzle-orm/node-postgres';
import { TablesRelationalConfig } from 'drizzle-orm/relations';
import { DRIZZLE_DB_PROVIDER } from './drizzle-db.provider';
import { DrizzleLogWriter } from './query-logger';

type DrizzleDbModuleOptions<T extends TablesRelationalConfig> = {
  url: string;
  relations: T;
};

@Global()
@Module({})
export class DrizzleDbModule {
  public static forRoot<T extends TablesRelationalConfig>(options: DrizzleDbModuleOptions<T>): DynamicModule {
    const { url, relations } = options;

    const logger = new DefaultLogger({ writer: new DrizzleLogWriter() });

    const drizzleDbProvider: Provider = {
      provide: DRIZZLE_DB_PROVIDER,
      useFactory: () => {
        return drizzle(url, { relations, logger });
      },
    };

    return {
      module: DrizzleDbModule,
      providers: [drizzleDbProvider],
      exports: [drizzleDbProvider],
    };
  }
}
