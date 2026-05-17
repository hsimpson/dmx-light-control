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
}
