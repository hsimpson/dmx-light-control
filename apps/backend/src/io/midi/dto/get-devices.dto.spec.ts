import { describe, it, expect } from 'vitest';
import { MidiDeviceDto, MidiDevicesDto } from './get-devices.dto';

describe('midi device dtos', () => {
  it('instantiates MidiDeviceDto', () => {
    const d = new MidiDeviceDto();
    d.port = 0;
    d.name = 'x';
    expect(d.port).toBe(0);
  });
  it('instantiates MidiDevicesDto', () => {
    const d = new MidiDevicesDto();
    d.inputDevices = [];
    d.outputDevices = [];
    expect(d.inputDevices).toEqual([]);
  });
});
