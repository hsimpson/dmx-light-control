import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { DmxSnifferCommand } from './dmx-sniffer.command';
import { DmxSnifferService } from './dmx-sniffer.service';

describe('DmxSnifferCommand', () => {
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`process.exit called with ${code}`);
  }) as never);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    vi.clearAllMocks();
  });
  afterAll(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('parseBus converts to number', () => {
    const cmd = new DmxSnifferCommand({} as any);
    expect(cmd.parseBus('3')).toBe(3);
  });

  it('parseAddress converts to number', () => {
    const cmd = new DmxSnifferCommand({} as any);
    expect(cmd.parseAddress('7')).toBe(7);
  });

  it('run exits on non-linux platforms', async () => {
    const platform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    const cmd = new DmxSnifferCommand({} as any);
    await expect(cmd.run([], {})).rejects.toThrow();
    expect(exitSpy).toHaveBeenCalledWith(1);
    Object.defineProperty(process, 'platform', { value: platform });
  });

  it('run exits when bus or address missing', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    const cmd = new DmxSnifferCommand({} as any);
    await expect(cmd.run([], {})).rejects.toThrow();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('run starts sniffer and exits 0 when options present', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    const service = { startSniffer: vi.fn().mockResolvedValue(undefined) } as unknown as DmxSnifferService;
    const cmd = new DmxSnifferCommand(service);
    await expect(cmd.run([], { bus: 1, address: 5 })).rejects.toThrow();
    expect(service.startSniffer).toHaveBeenCalledWith(1, 5);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
