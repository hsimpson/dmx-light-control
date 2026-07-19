import { ClassSerializerInterceptor, INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { CommandFactory } from 'nest-commander';
import { describe, it, Mock, vi } from 'vitest';
import { AppModule } from './app.module';
import { bootstrap, registerGlobals } from './main';

describe('main', () => {
  describe('registerGlobals', () => {
    it('registers a ValidationPipe with whitelist and transform enabled', () => {
      const app = createMockApp();
      registerGlobals(app as unknown as INestApplication);

      expect(app.useGlobalPipes.mock.calls).toHaveLength(1);
      expect(app.useGlobalPipes.mock.calls[0]?.[0]).toBeInstanceOf(ValidationPipe);
      expect(app.useGlobalInterceptors.mock.calls).toHaveLength(1);
    });

    it('registers a ClassSerializerInterceptor exposing all properties', () => {
      const app = createMockApp();
      registerGlobals(app as unknown as INestApplication);

      expect(app.useGlobalInterceptors.mock.calls).toHaveLength(1);
      expect(app.useGlobalInterceptors.mock.calls[0]?.[0]).toBeInstanceOf(ClassSerializerInterceptor);
    });
  });

  describe('bootstrap', () => {
    const originalArgv = process.argv;
    const originalEnv = process.env.NODE_ENV;

    let listenSpy: Mock<(port: number) => Promise<void>>;
    let getSpy: Mock<() => number>;
    let logSpy: Mock;
    let createSpy: Mock;
    let runSpy: Mock;

    beforeEach(() => {
      listenSpy = vi.fn().mockResolvedValue(undefined);
      getSpy = vi.fn().mockReturnValue(3000);
      logSpy = vi.spyOn(Logger, 'log').mockImplementation(() => undefined);

      createSpy = vi.spyOn(NestFactory, 'create').mockResolvedValue({
        useGlobalPipes: vi.fn(),
        useGlobalInterceptors: vi.fn(),
        enableCors: vi.fn(),
        get: vi.fn().mockReturnValue({ getOrThrow: getSpy }),
        listen: listenSpy,
      } as unknown as NestFastifyApplication);

      runSpy = vi.spyOn(CommandFactory, 'run').mockResolvedValue(undefined);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      process.argv = originalArgv;
      process.env.NODE_ENV = originalEnv;
    });

    it('starts the HTTP server on the configured port', async () => {
      process.argv = ['node', 'main.js'];

      await bootstrap();

      expect(createSpy.mock.calls[0]?.[0]).toBe(AppModule);
      expect(createSpy.mock.calls[0]?.[1]).toBeInstanceOf(FastifyAdapter);
      expect(listenSpy.mock.calls[0]?.[0]).toBe(3000);
      expect(logSpy.mock.calls[0]?.[0]).toContain('http://localhost:3000');
      expect(runSpy.mock.calls).toHaveLength(0);
    });

    it('runs as a CLI command when argv contains a subcommand', async () => {
      process.argv = ['node', 'main.js', 'dmx-sniffer'];

      await bootstrap();

      expect(runSpy.mock.calls[0]?.[0]).toBe(AppModule);
      expect(runSpy.mock.calls[0]?.[1]).toEqual(['log', 'warn', 'error']);
      expect(createSpy.mock.calls).toHaveLength(0);
      expect(listenSpy.mock.calls).toHaveLength(0);
    });
  });
});

function createMockApp() {
  return {
    useGlobalPipes: vi.fn(),
    useGlobalInterceptors: vi.fn(),
    get: vi.fn().mockReturnValue(new Reflector()),
  };
}
