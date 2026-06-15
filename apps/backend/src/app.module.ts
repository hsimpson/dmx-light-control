import { loadConfig } from '@/config/config';
import { DbConfigService } from '@/db/dbconfig.service';
import { AppEventEmitter } from '@/events/app-event-emitter';
import { DmxModule } from '@/io/dmx/dmx.module';
import { IoBridgeModule } from '@/io/io-bridge/io-bridge.module';
import { MidiModule } from '@/io/midi/midi.module';
import { DrizzlePGModule } from '@knaadh/nestjs-drizzle-pg';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GraphQLModule } from '@nestjs/graphql';
import { GraphQLUUID } from 'graphql-scalars';
import { DB_PROVIDER } from './db/db.provider';
import { FixturesModule } from './fixtures/fixtures.module';
import { GlobalGqlExceptionFilter } from './shared/graphql-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [loadConfig],
    }),
    DrizzlePGModule.registerAsync({
      tag: DB_PROVIDER,
      useClass: DbConfigService,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: false,
      autoSchemaFile: true,
      sortSchema: true,
      resolvers: { UUID: GraphQLUUID },
      formatError: formattedError => {
        if (process.env.NODE_ENV === 'production') {
          const { stacktrace, ...extensions } = formattedError.extensions ?? {};
          return {
            ...formattedError,
            extensions,
          };
        }

        return formattedError;
      },
    }),
    EventEmitterModule.forRoot(),
    DmxModule,
    MidiModule,
    IoBridgeModule,
    FixturesModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalGqlExceptionFilter,
    },
    AppEventEmitter,
  ],
  exports: [AppEventEmitter],
})
export class AppModule {}
