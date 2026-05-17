# Backend

This is the backend application for the DMX Light Control project. It is built using NestJS and provides an API for controlling DMX devices, as well as a command-line interface for sniffing DMX data from USB devices.

## DMX Sniffer Command

The `dmx-sniffer` command allows you to monitor DMX data from a specified USB device. To use this command, you need to provide the bus number and address of the USB device you want to monitor. This command is only supported on Linux, because it relies on `usbmon` kernel module to capture USB traffic.

### Usage

Load the `usbmon` kernel module if it's not already loaded:

```bash
sudo modprobe usbmon
```

Find the bus number and address of your USB device using the `lsusb` command:

```bash
lsusb
```

Then, run the `dmx-sniffer` command with the appropriate options:

```bash
node dist/apps/backend/main.js dmx-sniffer --bus <bus_number> --address <device_address>
```
