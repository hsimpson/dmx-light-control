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
  mockCommandFactoryRun,
} = vi.hoisted(() => {
  const useGlobalPipes = vi.fn();
  const useGlobalInterceptors = vi.fn();
  const enableCors = vi.fn();
  const register = vi.fn().mockResolvedValue(undefined);
  const listen = vi.fn().mockResolvedValue(undefined);
  const getOrThrow = vi.fn().mockReturnValue(3000);
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
  });
  const loggerLog = vi.fn();
  const commandFactoryRun = vi.fn().mockResolvedValue(undefined);

  return {
    mockUseGlobalPipes: useGlobalPipes,
    mockUseGlobalInterceptors: useGlobalInterceptors,
    mockEnableCors: enableCors,
    mockRegister: register,
    mockListen: listen,
    mockGetOrThrow: getOrThrow,
    mockCreate: create,
    mockLoggerLog: loggerLog,
    mockCommandFactoryRun: commandFactoryRun,
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
      run: mockCommandFactoryRun,
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
    expect(mockCommandFactoryRun).not.toHaveBeenCalled();
  });

  it('should run CommandFactory when CLI args are present', async () => {
    process.argv = ['node', 'main.js', 'dmx-sniffer'];
    vi.resetModules();

    await import('./main');

    await vi.waitFor(() => {
      expect(mockCommandFactoryRun).toHaveBeenCalled();
    });

    expect(mockCommandFactoryRun).toHaveBeenCalledWith(expect.any(Function), ['log', 'warn', 'error']);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
