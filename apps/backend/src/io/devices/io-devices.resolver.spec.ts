import { describe, expect, it, vi } from 'vitest';
import { IoDeviceDto, IoDeviceStateDto } from './dto/io-device.dto';
import { IoDeviceDiscoveryService } from './io-device-discovery.service';
import { IoDeviceManagerService } from './io-device-manager.service';
import { IoDevicesResolver } from './io-devices.resolver';
import { IoDeviceKind, IoDeviceStatus, type AvailableIoDevice } from './match-io-devices';

const ftdi: AvailableIoDevice = {
  kind: IoDeviceKind.DmxSerial,
  handle: '/dev/ttyUSB0',
  vendorId: '0403',
  productId: '6001',
  name: 'FT232R USB UART',
  manufacturer: 'FTDI',
  serial: 'A50285BI',
  usbLocation: '3-10',
};

const { handle: _handle, ...configuredFtdi } = ftdi;

class FakeDiscovery {
  public listAvailable = vi.fn<() => Promise<AvailableIoDevice[]>>().mockResolvedValue([ftdi]);
}

class FakeManager {
  public statuses = vi.fn();
  public constructor(status: IoDeviceStatus, handle: string | null) {
    this.statuses.mockReturnValue([{ device: configuredFtdi, status, handle }]);
  }
}

function buildResolver(status = IoDeviceStatus.Missing, handle: string | null = null): IoDevicesResolver {
  return new IoDevicesResolver(
    new FakeDiscovery() as unknown as IoDeviceDiscoveryService,
    new FakeManager(status, handle) as unknown as IoDeviceManagerService,
  );
}

describe('IoDevicesResolver', () => {
  it('GIVEN a connected device WHEN availableIoDevices is queried THEN returns its identity without the OS handle', async () => {
    const resolver = buildResolver();

    const [device] = await resolver.availableIoDevices();

    expect(device).toBeInstanceOf(IoDeviceDto);
    expect(device).not.toHaveProperty('handle');
    expect(device).toMatchObject({ kind: IoDeviceKind.DmxSerial, serial: 'A50285BI', usbLocation: '3-10' });
  });

  it('GIVEN configured devices WHEN ioDevices is queried THEN returns each with its status', () => {
    const [device] = buildResolver().ioDevices();

    expect(device).toBeInstanceOf(IoDeviceStateDto);
    expect(device).toMatchObject({ serial: 'A50285BI', status: IoDeviceStatus.Missing, handle: null });
  });

  it('GIVEN a connected device WHEN ioDevices is queried THEN returns the port it is open on', () => {
    const [device] = buildResolver(IoDeviceStatus.Connected, '/dev/ttyUSB0').ioDevices();

    expect(device).toMatchObject({ status: IoDeviceStatus.Connected, handle: '/dev/ttyUSB0' });
  });
});
