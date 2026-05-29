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
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GraphQLModule } from '@nestjs/graphql';
import { DB_PROVIDER } from './db/db.provider';
import { FixturesModule } from './fixtures/fixtures.module';

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
    }),
    EventEmitterModule.forRoot(),
    DmxModule,
    MidiModule,
    IoBridgeModule,
    FixturesModule,
  ],
  providers: [AppEventEmitter],
  exports: [AppEventEmitter],
})
export class AppModule {}
