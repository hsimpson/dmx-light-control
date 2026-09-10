import { AppEventEmitter } from '@/events/app-event-emitter';
import { UsbDeviceService } from '@/io/usb/usb-device.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DmxUniverseService } from './dmx-universe.service';

@Injectable()
export class DmxSendService implements OnModuleInit {
  // This service will handle the logic for sending DMX data frames to USB devices.
  // It will be used by the DmxSendCommand to start the sender and process the data.

  private readonly logger = new Logger(DmxSendService.name);
  private _isSending = false;
  private device?: USBDevice;

  public constructor(
    private readonly usbDeviceService: UsbDeviceService,
    private readonly eventEmitter: AppEventEmitter,
    private readonly universe: DmxUniverseService,
  ) {}

  public onModuleInit() {
    this.eventEmitter.on('dmx.channelValues', values => {
      this.universe.apply(values);

      // If not already sending, start the sender
      if (!this.isSending()) {
        void this.startSending();
      }
    });
  }

  public isSending(): boolean {
    return this._isSending;
  }

  public async startSending(): Promise<void> {
    // REVIEW: device selection
    this.device = await this.usbDeviceService.getDeviceBySerial('A50285BI');
    this.logger.log(`Found device: ${this.device ? this.device.productName : 'None'}`);
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
        void this.usbDeviceService.send(this.device, this.universe.getFrame().buffer as ArrayBuffer);
      }
    }, 33); // ~30 Hz refresh rate (max)
  }
}
