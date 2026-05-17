import { Injectable, Logger } from '@nestjs/common';
import { WebUSB, WebUSBDevice } from 'usb';

@Injectable()
export class UsbDeviceService {
  private readonly logger = new Logger(UsbDeviceService.name);

  private readonly customWebUSB: WebUSB;

  public constructor() {
    this.customWebUSB = new WebUSB({
      // Bypass checking for authorized devices
      allowAllDevices: true,
    });
  }

  public async getConnectedDevices(): Promise<WebUSBDevice[] | undefined> {
    try {
      const devices = await this.customWebUSB.getDevices();
      return devices as WebUSBDevice[];
    } catch (error) {
      this.logger.error('Error fetching USB devices:', error);
      return undefined;
    }
  }

  public async getDeviceBySerial(
    serial: string,
  ): Promise<WebUSBDevice | undefined> {
    const devices = await this.getConnectedDevices();
    if (!devices) {
      return undefined;
    }
    const device = devices.find((d) => d.serialNumber === serial);
    return device;
  }

  public async openDevice(device: WebUSBDevice): Promise<void> {
    try {
      await device.open();
      this.logger.log(`Opened device with serial '${device.serialNumber}'`);
      await device.selectConfiguration(1);
      this.logger.log(
        `Selected configuration 1 for device with serial '${device.serialNumber}'`,
      );

      const interfaceNumber =
        device.configurations[0]?.interfaces[0]?.interfaceNumber;
      if (interfaceNumber === undefined) {
        throw new Error('No interface found on device');
      }
      await device.claimInterface(interfaceNumber);
      this.logger.log(
        `Claimed interface ${interfaceNumber} for device with serial '${device.serialNumber}'`,
      );

      const endpoints =
        device.configurations[0]?.interfaces[0]?.alternates[0]?.endpoints;

      const endpoint = endpoints?.find((ep) => ep.direction === 'in');

      if (!endpoint) {
        throw new Error('No IN endpoint found on device');
      }

      const result = await device.transferIn(
        endpoint.endpointNumber,
        endpoint.packetSize, // 64 = byte length
      );
      if (result.data) {
        const bytes = new Uint8Array(result.data.buffer);
        console.log(bytes);
      }

      if (!endpoints || endpoints.length === 0) {
        throw new Error('No endpoints found on device');
      }
    } catch (error) {
      this.logger.error(
        `Error opening device with serial '${device.serialNumber}':`,
        error,
      );
    }
  }
}
