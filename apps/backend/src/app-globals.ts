import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/** Pipes and interceptors every HTTP app needs; shared by `main.ts` and the e2e test app. */
export function registerGlobals(app: INestApplication): void {
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
