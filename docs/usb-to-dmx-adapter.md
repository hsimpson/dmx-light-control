# USB-to-DMX adapter (FTDI FT232R)

The live DMX output path is a USB-to-UART adapter built on the FTDI FT232R. `SerialSendService` opens that UART and sends DMX512 frames. The notes below are from the adapter attached on this machine on 23 Oct 2026 (`Bus 003 Device 009: ID 0403:6001`).

## Attached device

| Field          | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| USB identity   | `0403:6001` (Future Technology Devices International)       |
| `lsusb` line   | `Bus 003 Device 009: ID 0403:6001 … FT232 Serial (UART) IC` |
| Product string | `FT232R USB UART`                                           |
| Manufacturer   | `FTDI`                                                      |
| Serial number  | `A50285BI` (stored in the chip EEPROM)                      |
| Device release | `bcdDevice 6.00` (the revision the FT232R reports)          |
| USB version    | 2.00, full speed only (12 Mbit/s)                           |
| Sysfs node     | `/sys/bus/usb/devices/3-10`                                 |
| Controller     | xHCI at PCI `0000:80:14.0` (USB 2.0 companion root hub)     |
| Topology       | Bus 3, root-hub port 10                                     |
| Power          | Bus-powered, 90 mA max. Remote wakeup is advertised.        |
| Configurations | 1                                                           |
| Interfaces     | 1, vendor-specific class `255/255/255`                      |
| Endpoints      | Bulk IN `0x81` and bulk OUT `0x02`, 64-byte packets         |

`0403:6001` is the default VID/PID for the FT232 family. The product string and `bcdDevice 6.00` identify this unit as the **FT232R**: USB full speed, on-chip clock, and a small internal EEPROM.

Bus and device numbers (`003` / `009`) are assigned at enumeration and change if the adapter is replugged or the machine reboots. The EEPROM serial `A50285BI` does not.

## Linux device nodes

The interface is vendor-specific and is claimed by `ftdi_sio` (`USB FTDI Serial Converters Driver`).

| Name    | Path                                                                        |
| ------- | --------------------------------------------------------------------------- |
| tty     | `/dev/ttyUSB0` (major 188, minor 0 while it is the first USB serial device) |
| by-id   | `/dev/serial/by-id/usb-FTDI_FT232R_USB_UART_A50285BI-if00-port0`            |
| by-path | `/dev/serial/by-path/pci-0000:80:14.0-usb-0:10:1.0-port0`                   |

The by-id symlink follows the EEPROM serial, so it stays stable across reboots and USB ports. The by-path symlink stays stable only while the adapter remains in this physical port. `/dev/ttyUSB0` moves if another USB serial device is enumerated first.

Until an application opens the port, termios is the driver default: 9600 baud, 8 data bits, no parity, 1 stop bit, with canonical input and echo still on. The `ftdi_sio` latency timer is 16 ms (the driver default). The driver may hold a short outgoing USB packet for up to that long before sending it.

Each bulk-IN packet starts with two modem-status bytes. `ftdi_sio` strips those before the remaining bytes appear on the tty.

## Chip

The FT232R is a single-channel USB full-speed to asynchronous UART bridge (TTL levels; 3.3 V or 5 V depending on the board):

- Baud rates from 300 bit/s to 3 Mbit/s
- 7 or 8 data bits, odd/even/mark/space/no parity, 1 or 2 stop bits
- RTS/CTS and the usual modem lines (DTR, DSR, DCD, RI) when the board wires them out
- About 128 bytes of transmit buffer and 256 bytes of receive buffer on the chip
- USB strings, the serial number, and CBUS pin functions in the internal EEPROM
- No external crystal; the clock is on the chip

USB descriptors do not describe the cable pinout. On a typical FT232R breakout or USB-DMX dongle, the lines that matter are TX, RX, power, and ground.

## How this app uses it

`SerialSendService` (`apps/backend/src/io/serial/serial-send.service.ts`) opens the UART as DMX512:

| Setting   | Value                                                                                |
| --------- | ------------------------------------------------------------------------------------ |
| Baud      | 250000                                                                               |
| Data bits | 8                                                                                    |
| Parity    | none                                                                                 |
| Stop bits | 2                                                                                    |
| Frame     | 513 bytes: start code `0x00`, then channels 1–512                                    |
| Break     | line held in break for 1 ms (DMX requires at least 88 µs), then the frame is written |
| Refresh   | about 30 Hz once channel values are being sent                                       |

Port selection is in `resolve-serial-path.ts`:

1. `DMX_SERIAL_PATH`, if set.
2. Otherwise the first listed port with vendor `0403` and product `6001`. On macOS the callout node `/dev/cu.usbserial-*` is used (a `/dev/tty.*` path is rewritten to `/dev/cu.*`).
3. Otherwise a name heuristic (`/dev/ttyUSB*` on Linux, `/dev/cu.usbserial*` or `/dev/cu.ft232r*` on macOS).
4. On Linux only, `/dev/ttyUSB0` when nothing was listed.

For this adapter the stable override is:

```bash
DMX_SERIAL_PATH=/dev/serial/by-id/usb-FTDI_FT232R_USB_UART_A50285BI-if00-port0
```

On macOS the same unit enumerates as `/dev/cu.usbserial-A50285BI`. The process user must be able to open the tty (on Linux, membership in the `dialout` group).
