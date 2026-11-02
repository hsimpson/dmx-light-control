import type { ProjectIoDevice } from '@/io/devices/match-io-devices';

export type ProjectEvents = {
  'project.ioDevicesActivated': { devices: ProjectIoDevice[] };
  /** The active project changed, or its saved console or fixture patch did; null when none is active. */
  'project.virtualConsoleUpdated': { projectPublicId: string | null };
};
