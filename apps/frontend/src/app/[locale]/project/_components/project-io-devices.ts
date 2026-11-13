import type { IoDeviceFieldsFragment, IoDeviceInput, IoDeviceStatus } from '@/shared/types/graphql/graphql';

export type IoDeviceRow = {
  key: string;
  device: IoDeviceFieldsFragment;
  configured: boolean;
  status: IoDeviceStatus | null;
  /** From the plugged-in device the row stands for; null when it is not plugged in. */
  maxInputChannels: number | null;
};

type DeviceIdentity = Omit<
  IoDeviceFieldsFragment,
  'customName' | 'midiMappingPublicId' | 'audioChannels' | 'maxInputChannels'
>;
type DeviceState = DeviceIdentity & { status: IoDeviceStatus };

const sameIdentity = (a: DeviceIdentity, b: DeviceIdentity) =>
  a.kind === b.kind &&
  a.vendorId === b.vendorId &&
  a.productId === b.productId &&
  a.name === b.name &&
  a.serial === b.serial;

const sameDevice = (a: DeviceIdentity, b: DeviceIdentity) => sameIdentity(a, b) && a.usbLocation === b.usbLocation;

/**
 * Configured devices first (with live status), then plugged-in devices not used yet.
 * A plugged-in device is hidden when a configured entry already accounts for it, preferring the same USB port.
 */
export function buildIoDeviceRows(
  configured: readonly IoDeviceFieldsFragment[],
  available: readonly IoDeviceFieldsFragment[],
  states: readonly DeviceState[],
): IoDeviceRow[] {
  const unclaimed = [...available];
  const claimed = configured.map(device => {
    const exact = unclaimed.findIndex(candidate => sameDevice(candidate, device));
    const index = exact >= 0 ? exact : unclaimed.findIndex(candidate => sameIdentity(candidate, device));
    return index >= 0 ? unclaimed.splice(index, 1)[0] : undefined;
  });

  return [
    ...configured.map((device, index) => ({
      key: `configured-${index}`,
      device,
      configured: true,
      status: states.find(state => sameDevice(state, device))?.status ?? null,
      maxInputChannels: claimed[index]?.maxInputChannels ?? null,
    })),
    ...unclaimed.map((device, index) => ({
      key: `available-${index}`,
      device,
      configured: false,
      status: null,
      maxInputChannels: device.maxInputChannels ?? null,
    })),
  ];
}

export const toIoDeviceInput = ({
  kind,
  name,
  manufacturer,
  serial,
  vendorId,
  productId,
  usbLocation,
  customName,
  midiMappingPublicId,
  audioChannels,
}: IoDeviceFieldsFragment): IoDeviceInput => ({
  kind,
  name,
  manufacturer,
  serial,
  vendorId,
  productId,
  usbLocation,
  customName,
  midiMappingPublicId,
  audioChannels,
});
