import {
  ClassSerializerInterceptor,
  ConsoleLogger,
  INestApplication,
  INestApplicationContext,
  Logger,
  LogLevel,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';
import { registerHttpPlugins } from './http-plugins';

function registerGlobals(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      // REVIEW: disable error messages in production
      disableErrorMessages: false,
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      strategy: 'exposeAll',
    }),
  );
}

function useConfiguredLogLevels(app: INestApplicationContext) {
  app.useLogger(app.get(ConfigService).getOrThrow<LogLevel[]>('logLevels'));
}

async function bootstrap() {
  // If CLI args are passed (e.g. `node main.js dmx-sniffer`), run as command
  if (process.argv.length > 2) {
    // nest-commander disables logging unless a logger instance is passed
    const cli = await CommandFactory.createWithoutRunning(AppModule, {
      logger: new ConsoleLogger(),
      bufferLogs: true,
    });
    useConfiguredLogLevels(cli);
    try {
      await CommandFactory.runApplication(cli);
    } finally {
      await cli.close();
    }
    return;
  }

  // Buffer until the configured log levels are applied; ConfigModule loads only with AppModule
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });
  useConfiguredLogLevels(app);
  registerGlobals(app);
  app.enableCors();
  await registerHttpPlugins(app);
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('port');
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
}

void bootstrap();
