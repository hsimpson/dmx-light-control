/// <reference types="vitest/globals" />
import { vi } from 'vitest';
import { UsbDeviceService } from './usb-device.service';

const { fakeWebUSB } = vi.hoisted(() => ({
  fakeWebUSB: {
    getDevices: vi.fn(),
  },
}));

vi.mock('usb', () => ({
  WebUSB: class {
    constructor(_opts: unknown) {}
    getDevices = fakeWebUSB.getDevices;
  },
}));

function build() {
  return new UsbDeviceService();
}

describe('UsbDeviceService', () => {
  afterEach(() => vi.clearAllMocks());

  it('getConnectedDevices returns devices', async () => {
    fakeWebUSB.getDevices.mockResolvedValue([{ productName: 'd' }]);
    const svc = build();
    expect(await svc.getConnectedDevices()).toHaveLength(1);
  });

  it('getConnectedDevices returns undefined on error', async () => {
    fakeWebUSB.getDevices.mockRejectedValue(new Error('no'));
    const svc = build();
    expect(await svc.getConnectedDevices()).toBeUndefined();
  });

  it('getDeviceBySerial returns undefined when no devices', async () => {
    fakeWebUSB.getDevices.mockResolvedValue(undefined);
    const svc = build();
    expect(await svc.getDeviceBySerial('x')).toBeUndefined();
  });

  it('getDeviceBySerial finds by serial', async () => {
    fakeWebUSB.getDevices.mockResolvedValue([{ serialNumber: 'A', productName: 'd' }]);
    const svc = build();
    expect(await svc.getDeviceBySerial('A')).toBeDefined();
  });

  it('getDeviceBySerial returns undefined when not found', async () => {
    fakeWebUSB.getDevices.mockResolvedValue([{ serialNumber: 'B' }]);
    const svc = build();
    expect(await svc.getDeviceBySerial('A')).toBeUndefined();
  });

  it('send transfers out when already opened', async () => {
    const transferOut = vi.fn().mockResolvedValue(undefined);
    const device = { opened: true, transferOut } as any;
    const svc = build();
    await svc.send(device, new ArrayBuffer(8));
    expect(transferOut).toHaveBeenCalledWith(2, expect.any(ArrayBuffer));
  });

  it('send opens, claims and selects config when closed', async () => {
    const transferOut = vi.fn().mockResolvedValue(undefined);
    const claimInterface = vi.fn().mockResolvedValue(undefined);
    const device = {
      opened: false,
      transferOut,
      open: vi.fn().mockResolvedValue(undefined),
      claimInterface,
      selectConfiguration: vi.fn().mockResolvedValue(undefined),
      configuration: { interfaces: [{}] },
    } as any;
    const svc = build();
    await svc.send(device, new ArrayBuffer(8));
    expect(device.open).toHaveBeenCalled();
    expect(claimInterface).toHaveBeenCalledWith(0);
    expect(device.selectConfiguration).toHaveBeenCalledWith(1);
    expect(transferOut).toHaveBeenCalled();
  });

  it('send falls back to detachKernelDriver when claim fails', async () => {
    const claimInterface = vi.fn().mockRejectedValue(new Error('busy'));
    const detachKernelDriver = vi.fn().mockResolvedValue(undefined);
    const device = {
      opened: false,
      transferOut: vi.fn().mockResolvedValue(undefined),
      open: vi.fn().mockResolvedValue(undefined),
      claimInterface,
      detachKernelDriver,
      selectConfiguration: vi.fn().mockResolvedValue(undefined),
      configuration: { interfaces: [{}] },
    } as any;
    const svc = build();
    await svc.send(device, new ArrayBuffer(8));
    expect(detachKernelDriver).toHaveBeenCalledWith(0);
  });

  it('openDevice skips detachKernelDriver when the method is absent', async () => {
    // First claim rejects (enters the catch/detach branch), second claim succeeds
    // so the device is configured and the success log fires.
    const claimInterface = vi.fn().mockRejectedValueOnce(new Error('busy')).mockResolvedValueOnce(undefined);
    const device = {
      opened: false,
      transferOut: vi.fn().mockResolvedValue(undefined),
      open: vi.fn().mockResolvedValue(undefined),
      claimInterface,
      selectConfiguration: vi.fn().mockResolvedValue(undefined),
      configuration: { interfaces: [{}] },
    } as any;
    const svc = build();
    const logSpy = vi.spyOn((svc as any).logger, 'log').mockImplementation(() => undefined);
    await (svc as any).openDevice(device);
    expect(device.open).toHaveBeenCalled();
    expect(claimInterface).toHaveBeenCalledTimes(2);
    expect(device.selectConfiguration).toHaveBeenCalledWith(1);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('openDevice logs error when open throws', async () => {
    const device = {
      opened: false,
      open: vi.fn().mockRejectedValue(new Error('fail')),
      claimInterface: vi.fn().mockRejectedValue(new Error('busy')),
      configuration: { interfaces: [{}] },
    } as any;
    const svc = build();
    const spy = vi.spyOn((svc as any).logger, 'error').mockImplementation(() => undefined);
    await (svc as any).openDevice(device);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('openDevice skips interface claim when no configuration is present', async () => {
    const claimInterface = vi.fn().mockResolvedValue(undefined);
    const device = {
      opened: false,
      open: vi.fn().mockResolvedValue(undefined),
      claimInterface,
      selectConfiguration: vi.fn().mockResolvedValue(undefined),
      configuration: undefined,
    } as any;
    const svc = build();
    const logSpy = vi.spyOn((svc as any).logger, 'log').mockImplementation(() => undefined);
    await (svc as any).openDevice(device);
    expect(device.open).toHaveBeenCalled();
    expect(claimInterface).toHaveBeenCalledTimes(1);
    expect(device.selectConfiguration).toHaveBeenCalledWith(1);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
