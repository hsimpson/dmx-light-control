import { ClassSerializerInterceptor, INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';

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

async function bootstrap() {
  // If CLI args are passed (e.g. `node main.js dmx-sniffer`), run as command
  if (process.argv.length > 2) {
    await CommandFactory.run(AppModule, ['log', 'warn', 'error']);
    return;
  }

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  registerGlobals(app);
  app.enableCors();
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('port');
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
}

void bootstrap();
