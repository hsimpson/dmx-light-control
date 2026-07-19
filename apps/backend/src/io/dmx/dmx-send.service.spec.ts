import { AppEventEmitter } from '@/events/app-event-emitter';
import { UsbDeviceService } from '@/io/usb/usb-device.service';
import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { DmxSendService } from './dmx-send.service';

const fakeDevice = {
  productName: 'FTDI',
  opened: true,
  transferOut: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
} as unknown as USBDevice;

type DmxSendServicePrivate = {
  logger: Logger;
  dmxFrame: Uint8Array;
  device?: USBDevice;
  _isSending: boolean;
  sendDmxFrame: () => void;
};

function build() {
  const usbDeviceServiceMock = {
    getDeviceBySerial: vi.fn<() => Promise<USBDevice | undefined>>(),
    send: vi.fn<() => Promise<void>>(),
  };
  usbDeviceServiceMock.getDeviceBySerial.mockResolvedValue(fakeDevice);
  usbDeviceServiceMock.send.mockResolvedValue(undefined);
  const eventEmitterMock = {
    emit: vi.fn<(event: string, payload?: unknown) => boolean>(),
    on: vi.fn<(event: string, listener: (...args: unknown[]) => void) => void>(),
  };
  const service = new DmxSendService(
    usbDeviceServiceMock as unknown as UsbDeviceService,
    eventEmitterMock as unknown as AppEventEmitter,
  );
  return { service, usbDeviceServiceMock, eventEmitterMock };
}

describe('DmxSendService', () => {
  beforeEach(() => {
    vi.spyOn(global, 'setInterval').mockReturnValue(123 as unknown as NodeJS.Timeout);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a dmx.channelValues listener on init', () => {
    const { service, eventEmitterMock } = build();
    service.onModuleInit();
    expect(eventEmitterMock.on).toHaveBeenCalledWith('dmx.channelValues', expect.any(Function));
  });

  it('isSending reflects state', () => {
    const { service } = build();
    expect(service.isSending()).toBe(false);
  });

  it('startSending resolves a device and sends a frame', async () => {
    const { service, usbDeviceServiceMock } = build();
    await service.startSending();
    expect(usbDeviceServiceMock.getDeviceBySerial).toHaveBeenCalledWith('A50285BI');
    expect(service.isSending()).toBe(true);
  });

  it('stopSending clears the sending flag', async () => {
    const { service } = build();
    await service.startSending();
    expect(service.isSending()).toBe(true);
    service.stopSending();
    expect(service.isSending()).toBe(false);
  });

  it('setChannelValues ignores out-of-range channel and value', () => {
    const { service, eventEmitterMock } = build();
    const warn = vi
      .spyOn((service as unknown as DmxSendServicePrivate).logger, 'warn')
      .mockImplementation(() => undefined);
    service.onModuleInit();
    const listener = eventEmitterMock.on.mock.calls[0]?.[1];
    listener?.([
      { channel: 0, value: 10 },
      { channel: 513, value: 10 },
      { channel: 1, value: -1 },
      { channel: 1, value: 256 },
      { channel: 5, value: 128 },
    ]);
    // four out-of-range entries are rejected (warn), one valid entry applied
    expect(warn).toHaveBeenCalledTimes(4);
    expect((service as unknown as DmxSendServicePrivate).dmxFrame[5]).toBe(128);
  });

  it('sendDmxFrame does nothing when no device', () => {
    const { service } = build();
    // device is undefined until startSending; call directly
    expect(() => {
      (service as unknown as DmxSendServicePrivate).sendDmxFrame();
    }).not.toThrow();
  });

  it('sendDmxFrame schedules interval when device present', async () => {
    const { service } = build();
    await service.startSending();
    (service as unknown as DmxSendServicePrivate).sendDmxFrame();
    expect(global.setInterval).toHaveBeenCalled();
  });

  it('interval callback sends frame when sending and device present', async () => {
    const { service, usbDeviceServiceMock } = build();
    await service.startSending();
    (service as unknown as DmxSendServicePrivate).sendDmxFrame();
    const callback = (global.setInterval as unknown as Mock<(...args: unknown[]) => unknown>).mock.calls[0]?.[0];
    expect(typeof callback).toBe('function');
    await (callback as () => Promise<void>)();
    expect(usbDeviceServiceMock.send).toHaveBeenCalled();
  });

  it('interval callback is a no-op when not sending', async () => {
    const { service, usbDeviceServiceMock } = build();
    (service as unknown as DmxSendServicePrivate).device = fakeDevice;
    (service as unknown as DmxSendServicePrivate).sendDmxFrame();
    (service as unknown as DmxSendServicePrivate)._isSending = false;
    const callback = (global.setInterval as unknown as Mock<(...args: unknown[]) => unknown>).mock.calls[0]?.[0];
    await (callback as () => Promise<void>)();
    expect(usbDeviceServiceMock.send).not.toHaveBeenCalled();
  });

  it('does not start sending again when already sending on channel update', () => {
    const { service, eventEmitterMock, usbDeviceServiceMock } = build();
    service.onModuleInit();
    const listener = eventEmitterMock.on.mock.calls[0]?.[1];
    (service as unknown as DmxSendServicePrivate)._isSending = true;
    listener?.([{ channel: 5, value: 128 }]);
    expect(usbDeviceServiceMock.getDeviceBySerial).not.toHaveBeenCalled();
  });

  it('logs None when no device is found on start', async () => {
    const { service, usbDeviceServiceMock } = build();
    usbDeviceServiceMock.getDeviceBySerial.mockResolvedValue(undefined);
    const logSpy = vi
      .spyOn((service as unknown as DmxSendServicePrivate).logger, 'log')
      .mockImplementation(() => undefined);
    await service.startSending();
    expect(logSpy).toHaveBeenCalledWith('Found device: None');
    logSpy.mockRestore();
  });
});
