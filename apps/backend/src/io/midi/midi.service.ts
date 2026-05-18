import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import midi, { MidiMessage } from 'midi';
import { OpenPortsDto } from './dto/open-ports.dto';
import { MidiDevice } from './types/midi.types';

@Injectable()
export class MidiService {
  // This service will handle the logic for receiving and sending MIDI messages to USB devices.
  private readonly logger = new Logger(MidiService.name);
  private readonly input = new midi.Input();
  private readonly output = new midi.Output();

  public constructor(private readonly eventEmitter: AppEventEmitter) {
    this.input.on('message', (deltaTime, message) => {
      this.handleMidiMessage(deltaTime, message);
    });

    this.eventEmitter.on('midi.sendMessage', async (message: MidiMessage) => {
      await this.sendMidiMessage(message);
    });
  }

  public getInputDevices(): MidiDevice[] {
    const count = this.input.getPortCount();
    return Array.from({ length: count }, (_, i) => ({
      port: i,
      name: this.input.getPortName(i),
    }));
  }

  public getOutputDevices(): MidiDevice[] {
    const count = this.output.getPortCount();
    return Array.from({ length: count }, (_, i) => ({
      port: i,
      name: this.output.getPortName(i),
    }));
  }

  public openPorts(openPortsDto: OpenPortsDto): void {
    const { inputPort, outputPort } = openPortsDto;
    this.input.openPort(inputPort);
    this.eventEmitter.emit('midi.inputOpened');
    this.output.openPort(outputPort);
    this.eventEmitter.emit('midi.outputOpened');
    this.logger.log(
      `Opened MIDI input port ${inputPort} and output port ${outputPort}`,
    );
  }

  public closePorts(): void {
    this.input.closePort();
    this.output.closePort();
    this.logger.log('Closed MIDI input and output ports');
  }

  private handleMidiMessage(deltaTime: number, message: MidiMessage): void {
    this.logger.log(
      `Received MIDI message: ${message.join(', ')} (deltaTime: ${deltaTime})`,
    );
    this.eventEmitter.emit('midi.inputMessage', message);
  }

  private async sendMidiMessage(message: MidiMessage): Promise<void> {
    this.logger.log(`Sent MIDI message: ${message.join(', ')}`);
    this.output.sendMessage(message);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
