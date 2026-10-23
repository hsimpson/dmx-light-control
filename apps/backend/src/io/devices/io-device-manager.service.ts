import { AppEventEmitter } from '@/events/app-event-emitter';
import { MidiService } from '@/io/midi/midi.service';
import { SerialSendService } from '@/io/serial/serial-send.service';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { IoDeviceDiscoveryService } from './io-device-discovery.service';
import {
  IoDeviceKind,
  IoDeviceStatus,
  matchIoDevices,
  type AvailableIoDevice,
  type IoDeviceIdentity,
  type IoDeviceMatch,
} from './match-io-devices';

export const IO_DEVICE_POLL_INTERVAL_MS = 2000;

/** Keeps the active project's devices connected: matches, opens, closes and re-polls for hotplug. */
@Injectable()
export class IoDeviceManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IoDeviceManagerService.name);
  private configured: IoDeviceIdentity[] = [];
  private matches: IoDeviceMatch<IoDeviceIdentity>[] = [];
  private reconciling: Promise<void> = Promise.resolve();
  private pollTimer: NodeJS.Timeout | null = null;
  private destroyed = false;

  public constructor(
    private readonly discovery: IoDeviceDiscoveryService,
    private readonly serialSend: SerialSendService,
    private readonly midi: MidiService,
    private readonly eventEmitter: AppEventEmitter,
  ) {}

  public onModuleInit(): void {
    this.eventEmitter.on('project.ioDevicesActivated', async ({ devices }) => {
      this.configured = devices;
      await this.reconcile();
    });
  }

  public onModuleDestroy(): void {
    this.destroyed = true;
    this.clearPoll();
  }

  public statuses(): IoDeviceMatch<IoDeviceIdentity>[] {
    return this.matches;
  }

  /** Serialized so an event-triggered run never overlaps a poll. */
  public async reconcile(): Promise<void> {
    this.reconciling = this.reconciling.then(async () => this.reconcileOnce());
    return this.reconciling;
  }

  private async reconcileOnce(): Promise<void> {
    this.clearPoll();
    if (this.destroyed) return;

    let available: AvailableIoDevice[];
    try {
      available = this.configured.length > 0 ? await this.discovery.listAvailable() : [];
    } catch (err) {
      this.logger.warn(`Device discovery failed: ${err instanceof Error ? err.message : String(err)}`);
      this.schedulePoll();
      return;
    }

    const matches = matchIoDevices(this.configured, available);
    await this.connect(IoDeviceKind.DmxSerial, matches, this.serialSend.openPaths(), {
      open: async path => this.serialSend.open(path),
      close: path => {
        this.serialSend.close(path);
      },
    });
    await this.connect(IoDeviceKind.Midi, matches, this.midi.openPortNames(), {
      open: portName => this.midi.open(portName),
      close: portName => {
        this.midi.close(portName);
      },
    });

    const open = new Set([...this.serialSend.openPaths(), ...this.midi.openPortNames()]);
    this.matches = matches.map(match =>
      match.handle && !open.has(match.handle) ? { ...match, status: IoDeviceStatus.Missing, handle: null } : match,
    );
    this.schedulePoll();
  }

  private async connect(
    kind: IoDeviceKind,
    matches: IoDeviceMatch<IoDeviceIdentity>[],
    openHandles: string[],
    port: { open: (handle: string) => Promise<boolean> | boolean; close: (handle: string) => void },
  ): Promise<void> {
    const wanted = new Set(
      matches.flatMap(match => (match.device.kind === kind && match.handle ? [match.handle] : [])),
    );
    for (const handle of openHandles) {
      if (!wanted.has(handle)) port.close(handle);
    }
    for (const handle of wanted) {
      if (!openHandles.includes(handle)) await port.open(handle);
    }
  }

  private schedulePoll(): void {
    if (this.destroyed || this.configured.length === 0) return;
    this.pollTimer = setTimeout(() => {
      void this.reconcile();
    }, IO_DEVICE_POLL_INTERVAL_MS);
  }

  private clearPoll(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
