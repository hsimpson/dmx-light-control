import { Injectable, Logger } from '@nestjs/common';
import midi from 'midi';

@Injectable()
export class MidiService {
  // This service will handle the logic for receiving and sending MIDI messages to USB devices.
  private readonly logger = new Logger(MidiService.name);
  private readonly input = new midi.Input();
  private readonly output = new midi.Output();

  public getInputDevices(): string[] {
    const count = this.input.getPortCount();
    return Array.from({ length: count }, (_, i) => this.input.getPortName(i));
  }

  public getOutputDevices(): string[] {
    const count = this.output.getPortCount();
    return Array.from({ length: count }, (_, i) => this.output.getPortName(i));
  }
}
