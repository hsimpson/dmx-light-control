import { AppEventEmitter } from '@/events/app-event-emitter';
import { IoDeviceManagerService } from '@/io/devices/io-device-manager.service';
import type { ProjectIoDevice } from '@/io/devices/match-io-devices';
import type { VirtualConsoleFeedback } from '@/io/virtual-console-playback/virtual-console-events';
import { MidiMessageType, type MidiFeedback } from '@/midi-mappings/midi-mapping';
import { MidiMappingRepository, type LoadedMidiMapping } from '@/midi-mappings/repositories/midi-mapping.repository';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { MidiMessage } from 'midi';

const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROL_CHANGE = 0xb0;

type MidiMappingEntry = LoadedMidiMapping['midiMappingEntries'][number];

/** Translates MIDI bytes of the active project's controllers to mapping entries, and LED feedback back to bytes. */
@Injectable()
export class IoBridgeService implements OnModuleInit {
  private readonly mappings = new Map<string, Promise<LoadedMidiMapping | undefined>>();
  private feedback = new Map<string, VirtualConsoleFeedback>();
  /** Last LED message per port and note, so only changes are sent. */
  private readonly sentLeds = new Map<string, Map<number, string>>();

  public constructor(
    private readonly eventEmitter: AppEventEmitter,
    private readonly devices: IoDeviceManagerService,
    private readonly mappingRepository: MidiMappingRepository,
  ) {}

  public onModuleInit(): void {
    this.eventEmitter.on('midi.inputMessage', async ({ portName, message }) => {
      await this.handleInput(portName, message);
    });
    this.eventEmitter.on('virtualConsole.feedback', async ({ entries }) => {
      this.feedback = new Map(entries.map(item => [item.entryPublicId, item]));
      await this.syncLeds();
    });
    this.eventEmitter.on('midi.outputOpened', async ({ portName }) => {
      this.sentLeds.delete(portName);
      await this.syncLeds();
    });
    this.eventEmitter.on('midiMapping.changed', async () => {
      this.mappings.clear();
      await this.syncLeds();
    });
  }

  private async handleInput(portName: string, message: MidiMessage): Promise<void> {
    const mapping = await this.mappingFor(this.connectedDevices().get(portName));
    const [status, number, value] = message;
    const kind = status & 0xf0;
    const messageType = kind === CONTROL_CHANGE ? MidiMessageType.ControlChange : MidiMessageType.Note;
    if (kind !== NOTE_ON && kind !== NOTE_OFF && kind !== CONTROL_CHANGE) {
      return;
    }
    const entry = mapping?.midiMappingEntries.find(
      candidate =>
        candidate.messageType === messageType && candidate.channel === (status & 0x0f) && candidate.number === number,
    );
    if (entry?.publicId) {
      this.eventEmitter.emit('virtualConsole.midiInput', {
        entryPublicId: entry.publicId,
        value: kind === NOTE_OFF ? 0 : value,
      });
    }
  }

  // shortcut: assigning another mapping to an already open controller shows its LEDs on the next state change or reconnect.
  private async syncLeds(): Promise<void> {
    for (const [portName, device] of this.connectedDevices()) {
      const mapping = await this.mappingFor(device);
      const sent = this.sentLeds.get(portName) ?? new Map<number, string>();
      this.sentLeds.set(portName, sent);
      for (const entry of mapping?.midiMappingEntries ?? []) {
        const message = this.ledMessage(entry);
        if (message && sent.get(entry.number) !== message.join()) {
          sent.set(entry.number, message.join());
          this.eventEmitter.emit('midi.sendMessage', { portName, message });
        }
      }
    }
  }

  /** Unbound entries show their default `off` state; `monitor` falls back to `on`. */
  private ledMessage(entry: MidiMappingEntry): MidiMessage | undefined {
    const item = entry.publicId ? this.feedback.get(entry.publicId) : undefined;
    const feedback: MidiFeedback | null | undefined = item?.feedback ?? entry.feedback;
    if (entry.messageType !== MidiMessageType.Note || !feedback) {
      return undefined;
    }
    const state = item?.state ?? 'off';
    const led = state === 'monitor' ? (feedback.monitor ?? feedback.on) : feedback[state];
    return [NOTE_ON | led.behavior, entry.number, led.color];
  }

  private connectedDevices(): Map<string, ProjectIoDevice> {
    return new Map(this.devices.statuses().flatMap(({ device, handle }) => (handle ? [[handle, device]] : [])));
  }

  private async mappingFor(device: ProjectIoDevice | undefined): Promise<LoadedMidiMapping | undefined> {
    const publicId = device?.midiMappingPublicId;
    if (!publicId) {
      return undefined;
    }
    const cached = this.mappings.get(publicId) ?? this.mappingRepository.findOneWithEntries(publicId);
    this.mappings.set(publicId, cached);
    return cached;
  }
}
