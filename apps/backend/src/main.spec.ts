import { ConsoleLogger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockUseGlobalPipes,
  mockUseGlobalInterceptors,
  mockEnableCors,
  mockRegister,
  mockListen,
  mockGetOrThrow,
  mockCreate,
  mockLoggerLog,
  mockUseLogger,
  mockCommandFactoryCreateWithoutRunning,
  mockCommandFactoryRunApplication,
  mockCliClose,
} = vi.hoisted(() => {
  const useGlobalPipes = vi.fn();
  const useGlobalInterceptors = vi.fn();
  const enableCors = vi.fn();
  const register = vi.fn().mockResolvedValue(undefined);
  const listen = vi.fn().mockResolvedValue(undefined);
  const getOrThrow = vi.fn().mockImplementation((key: string) => (key === 'port' ? 3000 : ['warn', 'error', 'fatal']));
  const useLogger = vi.fn();
  const get = vi.fn().mockImplementation((token: { name?: string }) => {
    if (token.name === 'ConfigService') {
      return { getOrThrow };
    }

    return {};
  });
  const create = vi.fn().mockResolvedValue({
    useGlobalPipes,
    useGlobalInterceptors,
    enableCors,
    register,
    listen,
    get,
    useLogger,
  });
  const loggerLog = vi.fn();
  const cliClose = vi.fn().mockResolvedValue(undefined);
  const commandFactoryCreateWithoutRunning = vi.fn().mockResolvedValue({ get, useLogger, close: cliClose });
  const commandFactoryRunApplication = vi.fn().mockResolvedValue(undefined);

  return {
    mockUseGlobalPipes: useGlobalPipes,
    mockUseGlobalInterceptors: useGlobalInterceptors,
    mockEnableCors: enableCors,
    mockRegister: register,
    mockListen: listen,
    mockGetOrThrow: getOrThrow,
    mockCreate: create,
    mockLoggerLog: loggerLog,
    mockUseLogger: useLogger,
    mockCommandFactoryCreateWithoutRunning: commandFactoryCreateWithoutRunning,
    mockCommandFactoryRunApplication: commandFactoryRunApplication,
    mockCliClose: cliClose,
  };
});

vi.mock('@nestjs/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@nestjs/core')>();

  return {
    ...actual,
    NestFactory: {
      create: mockCreate,
    },
  };
});

vi.mock('nest-commander', async importOriginal => {
  const actual = await importOriginal<typeof import('nest-commander')>();

  return {
    ...actual,
    CommandFactory: {
      createWithoutRunning: mockCommandFactoryCreateWithoutRunning,
      runApplication: mockCommandFactoryRunApplication,
    },
  };
});

vi.mock('@nestjs/common', async importOriginal => {
  const actual = await importOriginal<typeof import('@nestjs/common')>();

  return {
    ...actual,
    Logger: Object.assign(actual.Logger, { log: mockLoggerLog }),
  };
});

describe('main bootstrap', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    vi.clearAllMocks();
    process.argv = ['node', 'main.js'];
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('should compile, register globals, and listen on configured port', async () => {
    vi.resetModules();

    await import('./main');

    await vi.waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });

    expect(mockUseGlobalPipes).toHaveBeenCalled();
    expect(mockUseGlobalInterceptors).toHaveBeenCalled();
    expect(mockEnableCors).toHaveBeenCalled();
    expect(mockRegister).toHaveBeenCalled();
    expect(mockListen).toHaveBeenCalledWith(3000);
    expect(mockGetOrThrow).toHaveBeenCalledWith('port');
    expect(mockLoggerLog).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000'));
    expect(mockCommandFactoryCreateWithoutRunning).not.toHaveBeenCalled();
  });

  it('should buffer startup logs and apply the configured log levels before listening', async () => {
    vi.resetModules();

    await import('./main');

    await vi.waitFor(() => {
      expect(mockListen).toHaveBeenCalled();
    });

    expect(mockCreate).toHaveBeenCalledWith(expect.any(Function), expect.anything(), { bufferLogs: true });
    expect(mockUseLogger).toHaveBeenCalledWith(['warn', 'error', 'fatal']);
    expect(mockUseLogger.mock.invocationCallOrder[0]).toBeLessThan(mockListen.mock.invocationCallOrder[0] ?? 0);
  });

  it('should run CommandFactory when CLI args are present', async () => {
    process.argv = ['node', 'main.js', 'dmx-sniffer'];
    vi.resetModules();

    await import('./main');

    await vi.waitFor(() => {
      expect(mockCliClose).toHaveBeenCalled();
    });

    const cliOptions: unknown = mockCommandFactoryCreateWithoutRunning.mock.lastCall?.[1];
    expect(cliOptions).toStrictEqual({ logger: new ConsoleLogger(), bufferLogs: true });
    expect(mockUseLogger).toHaveBeenCalledWith(['warn', 'error', 'fatal']);
    expect(mockCommandFactoryRunApplication).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
