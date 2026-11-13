import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import midi, { MidiMessage } from 'midi';

// @types/midi only allows 3-byte messages; RtMidi sends any length, which SysEx needs.
declare module 'midi' {
  interface Output {
    sendMessage(message: readonly number[]): void;
  }
}

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
  private readonly probeInput = new midi.Input();
  private readonly probeOutput = new midi.Output();
  private probing: Promise<unknown> = Promise.resolve();
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
    return uniquePortNames(portNames(this.inputLister));
  }

  public openPortNames(): string[] {
    return [...this.devices.keys()];
  }

  /** Opens input and (if present) output by name; port indexes shift whenever devices come and go. */
  public open(portName: string): boolean {
    if (this.devices.has(portName)) return true;

    const { inputIndex, outputIndex } = this.findPortIndexes(portName);
    if (inputIndex < 0) {
      this.logger.warn(`MIDI port "${portName}" is not available`);
      return false;
    }

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

  /** Sends a request and returns the first reply `parseReply` accepts, or null. Live ports keep ignoring SysEx. */
  public async probe<T>(
    portName: string,
    request: readonly number[],
    parseReply: (message: readonly number[]) => T | null,
    timeoutMs: number,
  ): Promise<T | null> {
    const run = async () => this.probeOnce(portName, request, parseReply, timeoutMs);
    const result = this.probing.then(run, run);
    // closePort only schedules libuv's close; reopening the probe ports before it ran aborts the process.
    this.probing = result.then(nextEventLoopTurn);
    return result;
  }

  private async probeOnce<T>(
    portName: string,
    request: readonly number[],
    parseReply: (message: readonly number[]) => T | null,
    timeoutMs: number,
  ): Promise<T | null> {
    const { inputIndex, outputIndex } = this.findPortIndexes(portName);
    if (inputIndex < 0 || outputIndex < 0) return null;

    try {
      this.probeInput.ignoreTypes(false, true, true);
      this.probeInput.openPort(inputIndex);
      this.probeOutput.openPort(outputIndex);
      return await this.awaitReply(request, parseReply, timeoutMs);
    } catch (err) {
      this.logger.warn(`MIDI probe of "${portName}" failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    } finally {
      closeDevice({ input: this.probeInput, output: this.probeOutput });
    }
  }

  private findPortIndexes(portName: string): { inputIndex: number; outputIndex: number } {
    const inputNames = portNames(this.inputLister);
    const inputIndex = uniquePortNames(inputNames).indexOf(portName);
    return { inputIndex, outputIndex: findOutputIndex(inputIndex, inputNames, portNames(this.outputLister)) };
  }

  private async awaitReply<T>(
    request: readonly number[],
    parseReply: (message: readonly number[]) => T | null,
    timeoutMs: number,
  ): Promise<T | null> {
    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, timeoutMs);
      this.probeInput.on('message', (_deltaTime: number, message: MidiMessage) => {
        const reply = parseReply(message);
        if (reply !== null) {
          clearTimeout(timeout);
          resolve(reply);
        }
      });
      this.probeOutput.sendMessage(request);
    });
  }

  private async sendMidiMessage(portName: string, message: MidiMessage): Promise<void> {
    const output = this.devices.get(portName)?.output;
    if (!output) return;
    this.logger.debug(`Sent MIDI message to ${portName}: ${message.join(', ')}`);
    output.sendMessage(message);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

async function nextEventLoopTurn(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

function portNames(port: midi.Input | midi.Output): string[] {
  return Array.from({ length: port.getPortCount() }, (_, index) => port.getPortName(index));
}

/** CoreMIDI lists identical units under the same names; later ones get Windows' "2- " prefix to stay addressable. */
function uniquePortNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return names.map(name => {
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${count}- ${name}`;
  });
}

/**
 * A unique exact name first; otherwise the k-th output of the same device prefix for its k-th input, because
 * macOS names paired endpoints differently (APC mini mk2: input "… Control", output "… Port 1") and repeats
 * names across identical units (the second unit's output "… Control" is not the first unit's).
 */
function findOutputIndex(inputIndex: number, inputNames: readonly string[], outputNames: readonly string[]): number {
  const inputName = inputNames[inputIndex];
  if (inputName === undefined) return -1;
  if (occurrences(inputNames, inputName) === 1 && occurrences(outputNames, inputName) === 1) {
    return outputNames.indexOf(inputName);
  }

  const lastSpace = inputName.lastIndexOf(' ');
  if (lastSpace <= 0) return -1;
  const devicePrefix = inputName.slice(0, lastSpace + 1);
  const position = inputNames.slice(0, inputIndex).filter(name => name.startsWith(devicePrefix)).length;
  const outputIndexes = outputNames.flatMap((name, index) => (name.startsWith(devicePrefix) ? [index] : []));
  return outputIndexes[position] ?? -1;
}

function occurrences(names: readonly string[], name: string): number {
  return names.filter(candidate => candidate === name).length;
}

function closeDevice({ input, output }: OpenMidiDevice): void {
  input.closePort();
  input.removeAllListeners();
  output?.closePort();
}
