import { describe, it, expect } from 'vitest';
import 'reflect-metadata';
import { UsbDeviceService } from './usb-device.service';
import { UsbModule } from './usb.module';

describe('UsbModule', () => {
  it('is defined as an NgModule', () => {
    expect(UsbModule.name).toBe('UsbModule');
  });

  it('declares UsbDeviceService as provider and export', () => {
    const providers = Reflect.getMetadata('providers', UsbModule) as unknown[];
    const exports = Reflect.getMetadata('exports', UsbModule) as unknown[];
    expect(providers).toContain(UsbDeviceService);
    expect(exports).toContain(UsbDeviceService);
  });
});
