# System requirements

## Linux

The server needs the PulseAudio client library, even on systems that use PipeWire and even if no project uses a sound input. Without it, the server does not start and the log shows `libpulse.so.0: cannot open shared object file`.

On Debian and Ubuntu, install it with:

```bash
sudo apt install libpulse0
```

On other distributions, install the package that provides `libpulse.so.0`.
