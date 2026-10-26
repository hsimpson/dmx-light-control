import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import midi, { MidiMessage } from 'midi';

type OpenMidiDevice = {
  input: midi.Input;
  output: midi.Output | null;
};

@Injectable()
export class MidiService implements OnModuleDestroy {
  private readonly logger = new Logger(MidiService.name);
  // Long-lived and only used for listing: on ALSA every new Input/Output registers another sequencer client.
  private readonly inputLister = new midi.Input();
  private readonly outputLister = new midi.Output();
  private readonly devices = new Map<string, OpenMidiDevice>();

  public constructor(private readonly eventEmitter: AppEventEmitter) {
    this.eventEmitter.on('midi.sendMessage', async ({ portName, message }) => {
      await this.sendMidiMessage(portName, message);
    });
  }

  public onModuleDestroy(): void {
    for (const portName of [...this.devices.keys()]) {
      this.close(portName);
    }
  }

  public listPortNames(): string[] {
    return portNames(this.inputLister);
  }

  public openPortNames(): string[] {
    return [...this.devices.keys()];
  }

  /** Opens input and (if present) output by name; port indexes shift whenever devices come and go. */
  public open(portName: string): boolean {
    if (this.devices.has(portName)) return true;

    const inputIndex = portNames(this.inputLister).indexOf(portName);
    if (inputIndex < 0) {
      this.logger.warn(`MIDI port "${portName}" is not available`);
      return false;
    }
    const outputIndex = findOutputIndex(portName, inputIndex, portNames(this.outputLister));

    const input = new midi.Input();
    input.on('message', (_deltaTime: number, message: MidiMessage) => {
      this.logger.debug(`Received MIDI message from ${portName}: ${message.join(', ')}`);
      this.eventEmitter.emit('midi.inputMessage', { portName, message });
    });
    const output = outputIndex >= 0 ? new midi.Output() : null;
    try {
      input.openPort(inputIndex);
      output?.openPort(outputIndex);
    } catch (err) {
      this.logger.error(`Failed to open MIDI port "${portName}": ${err instanceof Error ? err.message : String(err)}`);
      closeDevice({ input, output });
      return false;
    }

    this.devices.set(portName, { input, output });
    this.logger.log(`Opened MIDI device "${portName}"`);
    if (output) {
      this.eventEmitter.emit('midi.outputOpened', { portName });
    }
    return true;
  }

  public close(portName: string): void {
    const device = this.devices.get(portName);
    if (!device) return;
    closeDevice(device);
    this.devices.delete(portName);
    this.logger.log(`Closed MIDI device "${portName}"`);
  }

  private async sendMidiMessage(portName: string, message: MidiMessage): Promise<void> {
    const output = this.devices.get(portName)?.output;
    if (!output) return;
    this.logger.debug(`Sent MIDI message to ${portName}: ${message.join(', ')}`);
    output.sendMessage(message);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

function portNames(port: midi.Input | midi.Output): string[] {
  return Array.from({ length: port.getPortCount() }, (_, index) => port.getPortName(index));
}

/**
 * Exact name first; otherwise the same-index output of the same device, because macOS names
 * paired endpoints differently (APC mini mk2: input "… Control", output "… Port 1").
 */
function findOutputIndex(inputName: string, inputIndex: number, outputNames: readonly string[]): number {
  const exactIndex = outputNames.indexOf(inputName);
  if (exactIndex >= 0) return exactIndex;

  const lastSpace = inputName.lastIndexOf(' ');
  if (lastSpace <= 0) return -1;
  const devicePrefix = inputName.slice(0, lastSpace + 1);
  return outputNames[inputIndex]?.startsWith(devicePrefix) ? inputIndex : -1;
}

function closeDevice({ input, output }: OpenMidiDevice): void {
  input.closePort();
  input.removeAllListeners();
  output?.closePort();
}
