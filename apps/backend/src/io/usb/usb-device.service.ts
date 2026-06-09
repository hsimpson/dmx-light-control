import { Injectable, Logger } from '@nestjs/common';
import { WebUSB } from 'usb';

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

  public async getConnectedDevices(): Promise<USBDevice[] | undefined> {
    try {
      return await this.customWebUSB.getDevices();
    } catch (error) {
      this.logger.error('Error fetching USB devices:', error);
      return undefined;
    }
  }

  public async getDeviceBySerial(serial: string): Promise<USBDevice | undefined> {
    const devices = await this.getConnectedDevices();
    if (!devices) {
      return undefined;
    }
    for (const device of devices) {
      this.logger.debug(`Checking device: ${device.productName} (Serial: ${device.serialNumber})`);
    }
    const device = devices.find(d => d.serialNumber === serial);
    return device;
  }

  public async send(device: USBDevice, data: ArrayBuffer): Promise<void> {
    // This method should implement the logic to send data to the USB device.
    if (!device.opened) {
      await this.openDevice(device);
    }

    await device.transferOut(2, data);
  }

  private async openDevice(device: USBDevice): Promise<void> {
    try {
      // Open the device first if not already opened
      await device.open();

      // CRITICAL: Detach the kernel driver from the interface causing the conflict
      // Since the log specified "interface 0 claimed by ftdi_sio", we target interface 0
      if (device.configuration?.interfaces[0]) {
        // Note: Depending on the exact usb@3.0.0 WebUSB implementation,
        // you may need to call device.forget() or use the non-standard
        // fallback if 'isKernelDriverActive'/'detachKernelDriver' are exposed.

        // In standard Node-USB / WebUSB environments, claiming the interface
        // or calling detach looks like this:
        try {
          await device.claimInterface(0);
        } catch {
          // If it fails because it's busy, we force detach if the library method exists:
          // @ts-expect-error (if using extended node-usb methods)
          if (typeof device.detachKernelDriver === 'function') {
            // @ts-expect-error (if using extended node-usb methods)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await device.detachKernelDriver(0);
          }
        }
      }

      // Now you can safely select the configuration
      await device.selectConfiguration(1);

      // If you didn't claim it above, claim it here
      await device.claimInterface(0);

      this.logger.log('USB Device configured and interface claimed successfully!');
    } catch (error) {
      this.logger.error('USB Error:', error);
    }
  }
}
