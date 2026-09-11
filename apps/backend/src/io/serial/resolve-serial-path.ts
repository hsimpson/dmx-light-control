export const FTDI_FT232R_VENDOR_ID = '0403';
export const FTDI_FT232R_PRODUCT_ID = '6001';
export const LINUX_SERIAL_DEFAULT = '/dev/ttyUSB0';

export type ListedSerialPort = {
  path: string;
  vendorId?: string;
  productId?: string;
};

export type SerialPathSource = 'override' | 'ftdi' | 'name' | 'linux-default';

export type ResolvedSerialPath = {
  path: string;
  source: SerialPathSource;
};

export function resolveSerialPath(input: {
  override?: string;
  platform: NodeJS.Platform;
  ports: readonly ListedSerialPort[];
}): ResolvedSerialPath | null {
  const trimmed = input.override?.trim();
  if (trimmed) {
    return { path: trimmed, source: 'override' };
  }

  const ftdi = pickPreferredPath(
    input.ports.filter(isFt232r).map(port => darwinCalloutPath(input.platform, port.path)),
    input.platform,
  );
  if (ftdi) {
    return { path: ftdi, source: 'ftdi' };
  }

  const named = pickPreferredPath(
    input.ports
      .filter(port => matchesNameHeuristic(input.platform, port.path))
      .map(port => darwinCalloutPath(input.platform, port.path)),
    input.platform,
  );
  if (named) {
    return { path: named, source: 'name' };
  }

  if (input.platform === 'linux') {
    return { path: LINUX_SERIAL_DEFAULT, source: 'linux-default' };
  }

  return null;
}

export function serialOpenHint(platform: NodeJS.Platform): string {
  if (platform === 'linux') {
    return 'Ensure the user is in the dialout group (sudo usermod -aG dialout $USER) and that DMX_SERIAL_PATH is unset or points at the UART.';
  }
  if (platform === 'darwin') {
    return 'Use the callout device /dev/cu.usbserial-* (not /dev/tty.* and not /dev/ttyUSB0). Set DMX_SERIAL_PATH if auto-detect misses it.';
  }
  return 'Set DMX_SERIAL_PATH to the UART device path.';
}

function normalizeUsbId(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.trim().toLowerCase().replace(/^0x/, '');
}

function isFt232r(port: ListedSerialPort): boolean {
  return (
    normalizeUsbId(port.vendorId) === FTDI_FT232R_VENDOR_ID && normalizeUsbId(port.productId) === FTDI_FT232R_PRODUCT_ID
  );
}

function darwinCalloutPath(platform: NodeJS.Platform, path: string): string {
  if (platform === 'darwin' && path.startsWith('/dev/tty.')) {
    return `/dev/cu.${path.slice('/dev/tty.'.length)}`;
  }
  return path;
}

function matchesNameHeuristic(platform: NodeJS.Platform, path: string): boolean {
  const callout = darwinCalloutPath(platform, path);
  if (platform === 'darwin') {
    const name = callout.toLowerCase();
    return name.startsWith('/dev/cu.usbserial') || name.startsWith('/dev/cu.ft232r');
  }
  if (platform === 'linux') {
    return /^\/dev\/ttyUSB\d+$/.test(path);
  }
  return false;
}

function pickPreferredPath(paths: readonly string[], platform: NodeJS.Platform): string | undefined {
  const unique = [...new Set(paths)];
  const filtered = platform === 'darwin' ? unique.filter(path => path.startsWith('/dev/cu.')) : unique;
  filtered.sort();
  return filtered[0];
}
