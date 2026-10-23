import type { IoDeviceIdentity } from '@/io/devices/match-io-devices';

export type ProjectEvents = {
  'project.ioDevicesActivated': { devices: IoDeviceIdentity[] };
};
