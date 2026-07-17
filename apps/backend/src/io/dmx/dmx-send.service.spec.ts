/// <reference types="vitest/globals" />
import { DmxSendService } from './dmx-send.service';
import { AppEventEmitter } from '@/events/app-event-emitter';
import { vi } from 'vitest';

const fakeDevice = { productName: 'FTDI', opened: true, transferOut: vi.fn().mockResolvedValue(undefined) } as any;

function build() {
  const usbDeviceService = {
    getDeviceBySerial: vi.fn().mockResolvedValue(fakeDevice),
    send: vi.fn().mockResolvedValue(undefined),
  } as any;
  const eventEmitter = { emit: vi.fn(), on: vi.fn() } as unknown as AppEventEmitter;
  const service = new DmxSendService(usbDeviceService, eventEmitter);
  return { service, usbDeviceService, eventEmitter };
}

describe('DmxSendService', () => {
  beforeEach(() => {
    vi.spyOn(global, 'setInterval').mockReturnValue(123 as unknown as NodeJS.Timeout);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a dmx.channelValues listener on init', () => {
    const { service, eventEmitter } = build();
    service.onModuleInit();
    expect((eventEmitter as any).on).toHaveBeenCalledWith('dmx.channelValues', expect.any(Function));
  });

  it('isSending reflects state', () => {
    const { service } = build();
    expect(service.isSending()).toBe(false);
  });

  it('startSending resolves a device and sends a frame', async () => {
    const { service, usbDeviceService } = build();
    await service.startSending();
    expect(usbDeviceService.getDeviceBySerial).toHaveBeenCalledWith('A50285BI');
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
    const { service, eventEmitter } = build();
    const warn = vi.spyOn((service as any).logger, 'warn');
    service.onModuleInit();
    const listener = (eventEmitter as any).on.mock.calls[0][1];
    listener([
      { channel: 0, value: 10 },
      { channel: 513, value: 10 },
      { channel: 1, value: -1 },
      { channel: 1, value: 256 },
      { channel: 5, value: 128 },
    ]);
    // four out-of-range entries are rejected (warn), one valid entry applied
    expect(warn).toHaveBeenCalledTimes(4);
    expect((service as any).dmxFrame[5]).toBe(128);
  });

  it('sendDmxFrame does nothing when no device', () => {
    const { service } = build();
    // device is undefined until startSending; call directly
    expect(() => (service as any).sendDmxFrame()).not.toThrow();
  });

  it('sendDmxFrame schedules interval when device present', async () => {
    const { service } = build();
    await service.startSending();
    (service as any).sendDmxFrame();
    expect(global.setInterval).toHaveBeenCalled();
  });
});
