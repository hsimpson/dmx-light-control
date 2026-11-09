# Systemvoraussetzungen

## Linux

Der Server braucht die PulseAudio-Client-Bibliothek, auch auf Systemen mit PipeWire und auch dann, wenn kein Projekt einen Audioeingang verwendet. Ohne sie startet der Server nicht, und im Log steht `libpulse.so.0: cannot open shared object file`.

Unter Debian und Ubuntu installieren Sie sie mit:

```bash
sudo apt install libpulse0
```

Unter anderen Distributionen installieren Sie das Paket, das `libpulse.so.0` bereitstellt.
