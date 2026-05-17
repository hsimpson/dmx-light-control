import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { UsbDeviceService } from '../usb/usb-device.service';

@Command({
  name: 'dmx-sniffer',
  description: 'Starts the DMX sniffer to monitor DMX data frames.',
})
export class DmxSnifferCommand extends CommandRunner {
  private readonly logger = new Logger(DmxSnifferCommand.name);

  public constructor(private readonly usbDeviceService: UsbDeviceService) {
    super();
  }

  public override async run(
    passedParams: string[],
    options: Record<string, string | boolean | number>,
  ): Promise<void> {
    this.logger.log(
      `dmx-sniffer command executed with params: ${passedParams.join(' ')} and options: ${JSON.stringify(options)}`,
    );

    if (options.list) {
      await this.listDevices();
    } else if (options.serial) {
      const device = await this.usbDeviceService.getDeviceBySerial(
        options.serial as string,
      );
      if (!device) {
        this.logger.error(`Device with serial '${options.serial}' not found.`);
        return;
      }
      this.logger.log(`Monitoring USB device with serial: '${options.serial}'`);
    }

    return Promise.resolve();
  }

  @Option({
    flags: '-l, --list',
    description: 'List all connected USB devices',
  })
  public parseList(val: string) {
    return val;
  }

  @Option({
    flags: '-s, --serial <serial>',
    description: 'Specify the serial number of the USB device to monitor',
  })
  public parseSerial(val: string) {
    return val;
  }

  private async listDevices() {
    const webUSBDevices = await this.usbDeviceService.getConnectedDevices();
    if (!webUSBDevices || webUSBDevices.length === 0) {
      this.logger.log('No USB devices found.');
      return;
    }

    let message = `Found ${webUSBDevices.length} USB device(s):\n`;
    for (const webUSBDevice of webUSBDevices) {
      this.logger.log(`Found device:`, webUSBDevice);

      message += `deviceClass: ${webUSBDevice.deviceClass}\n`;
      message += `deviceSubclass: ${webUSBDevice.deviceSubclass}\n`;
      message += `deviceProtocol: ${webUSBDevice.deviceProtocol}\n`;
      message += `vendorId: ${webUSBDevice.vendorId}\n`;
      message += `productId: ${webUSBDevice.productId}\n`;
      message += `manufacturerName: ${webUSBDevice.manufacturerName}\n`;
      message += `productName: ${webUSBDevice.productName}\n`;
      message += `serialNumber: ${webUSBDevice.serialNumber}\n`;
    }

    this.logger.log(message);
  }
}
