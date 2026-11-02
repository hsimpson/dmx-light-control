import { Query, Resolver } from '@nestjs/graphql';
import { plainToInstance } from 'class-transformer';
import { IoDeviceDto, IoDeviceStateDto } from './dto/io-device.dto';
import { IoDeviceDiscoveryService } from './io-device-discovery.service';
import { IoDeviceManagerService } from './io-device-manager.service';

@Resolver()
export class IoDevicesResolver {
  public constructor(
    private readonly discovery: IoDeviceDiscoveryService,
    private readonly manager: IoDeviceManagerService,
  ) {}

  @Query(() => [IoDeviceDto], {
    name: 'availableIoDevices',
    description: 'USB DMX outputs and MIDI controllers currently connected to the backend host',
  })
  public async availableIoDevices(): Promise<IoDeviceDto[]> {
    const devices = await this.discovery.listAvailable();
    return devices.map(({ handle: _handle, ...device }) => plainToInstance(IoDeviceDto, device));
  }

  @Query(() => [IoDeviceStateDto], {
    name: 'ioDevices',
    description: 'Input/output devices of the active project with their connection status',
  })
  public ioDevices(): IoDeviceStateDto[] {
    return this.manager
      .statuses()
      .map(({ device, status }) => plainToInstance(IoDeviceStateDto, { ...device, status }));
  }
}
