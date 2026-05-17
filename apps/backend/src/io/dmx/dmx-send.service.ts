import { UsbDeviceService } from '@/io/usb/usb-device.service';
import { Injectable, Logger } from '@nestjs/common';
import { WebUSBDevice } from 'usb';
import { DmxValue } from './types/dmx.types';

@Injectable()
export class DmxSendService {
  // This service will handle the logic for sending DMX data frames to USB devices.
  // It will be used by the DmxSendCommand to start the sender and process the data.

  private readonly logger = new Logger(DmxSendService.name);
  private dmxFrame = new Uint8Array(513); // DMX frame: start byte + 512 channel values
  private _isSending = false;
  private device?: WebUSBDevice;

  public constructor(private readonly usbDeviceService: UsbDeviceService) {
    this.dmxFrame.fill(0); // Initialize DMX frame with zeros
  }

  public isSending(): boolean {
    return this._isSending;
  }

  public setChannelValues(channelValues: DmxValue[]): void {
    // Update the DMX frame with the provided channel values
    this.logger.debug(
      `Setting DMX channel values: ${JSON.stringify(channelValues)}`,
    );
    for (const { channel, value } of channelValues) {
      if (channel < 1 || channel > 512) {
        this.logger.warn(
          `Invalid DMX channel: ${channel}. Must be between 1 and 512.`,
        );
        continue;
      }
      if (value < 0 || value > 255) {
        this.logger.warn(
          `Invalid DMX value: ${value}. Must be between 0 and 255.`,
        );
        continue;
      }
      this.dmxFrame[channel] = value; // Channel numbers are 1-based, array is 0-based
    }
  }

  public async startSending(): Promise<void> {
    this.device = await this.usbDeviceService.getDeviceBySerial('A50285BI');
    this.logger.log(
      `Found device: ${this.device ? this.device.productName : 'None'}`,
    );
    this.sendDmxFrame();
  }

  public stopSending(): void {
    this._isSending = false;
  }

  private sendDmxFrame() {
    if (!this.device) {
      this.logger.error('No device found to send DMX data');
      this._isSending = false;
      return;
    }
    this._isSending = true;

    setInterval(() => {
      if (this._isSending && this.device) {
        void this.usbDeviceService.send(this.device, this.dmxFrame.buffer);
      }
    }, 33); // ~30 Hz refresh rate (max)
  }
}
