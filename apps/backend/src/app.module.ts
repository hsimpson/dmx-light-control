import { relations } from '@/db/relations';
import { AppEventEmitter } from '@/events/app-event-emitter';
import { DmxModule } from '@/io/dmx/dmx.module';
import { IoBridgeModule } from '@/io/io-bridge/io-bridge.module';
import { MidiModule } from '@/io/midi/midi.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GraphQLModule } from '@nestjs/graphql';
import { GraphQLFormattedError } from 'graphql';
import { GraphQLUUID } from 'graphql-scalars';
import { loadConfig } from './config/config';
import { resolveDatabaseUrl } from './db/connection';
import { DrizzleDbModule } from './db/drizzle-db/drizzle-db.module';
import { FixturesModule } from './fixtures/fixtures.module';
import { GlobalGqlExceptionFilter } from './shared/graphql-exception.filter';

const formatErrorHandler = (formattedError: GraphQLFormattedError): GraphQLFormattedError => {
  if (process.env.NODE_ENV === 'production') {
    const { stacktrace, ...extensions } = formattedError.extensions ?? {};
    return {
      ...formattedError,
      extensions,
    };
  }

  return formattedError;
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
      load: [loadConfig],
    }),
    DrizzleDbModule.forRoot({
      url: resolveDatabaseUrl(),
      relations,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: false,
      autoSchemaFile: true,
      sortSchema: true,
      resolvers: { UUID: GraphQLUUID },
      formatError: formatErrorHandler,
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
