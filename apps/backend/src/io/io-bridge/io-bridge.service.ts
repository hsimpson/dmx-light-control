import { AppEventEmitter } from '@/events/app-event-emitter';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MidiMessage } from 'midi';

// this is for testing with the Akai APC mini mk2
const noteDmxMapping: Record<number, number[]> = {
  // Map MIDI note numbers to DMX channel values (example mapping)
  0: [1], // button 0 maps to DMX channel 1
  1: [2], // button 1 maps to DMX channel 2
  2: [3], // button 2 maps to DMX channel 3
  3: [4], // button 3 maps to DMX channel 4

  48: [1, 10], // 1st fader maps to DMX channel 1, 10
  49: [2, 11], // 2nd fader maps to DMX channel 2, 11
  50: [3, 12], // 3rd fader maps to DMX channel 3, 12
  51: [4, 13], // 4th fader maps to DMX channel 4, 13
  52: [5, 14], // 5th fader maps to DMX channel 5, 14

  56: [6, 15], // 9th fader maps to DMX channel 6, 15
};

// format: [behavior, button, color]
const ledMidiMapping: MidiMessage[] = [
  // [0x96, 0, 0x5], // 100% brightness for button 1 with red color (#FF0000)
  // [0x96, 1, 0x15], // 100% brightness for button 2 with green color (#00FF00)
  // [0x96, 2, 0x2d], // 100% brightness for button 3 with blue color  (#0000FF)
  // [0x9d, 3, 0x5], // Blinking 1/8 for button 4 with red color (#FF0000)
  // [0x9d, 4, 0x15], // Blinking 1/8 for button 5 with green color (#00FF00)
  // [0x9d, 5, 0x2d], // Blinking 1/8 for button 6 with blue color (#0000FF)
  // [0x90, 0x64, 0x1], // single-color LEDs only listen on channel 0 (0x90): Track Button 1 on
  // [0x90, 0x65, 0x1], // single-color LEDs only listen on channel 0 (0x90): Track Button 2 on
  // [0x90, 0x66, 0x1], // single-color LEDs only listen on channel 0 (0x90): Track Button 3 on
  // [0x90, 0x67, 0x1], // single-color LEDs only listen on channel 0 (0x90): Track Button 4 on
  // [0x90, 0x68, 0x1], // single-color LEDs only listen on channel 0 (0x90): Track Button 5 on
  // [0x90, 0x69, 0x1], // single-color LEDs only listen on channel 0 (0x90): Track Button 6 on
  // [0x90, 0x6a, 0x1], // single-color LEDs only listen on channel 0 (0x90): Track Button 7 on
  // [0x90, 0x6b, 0x1], // single-color LEDs only listen on channel 0 (0x90): Track Button 8 on
  // [0x90, 0x70, 0x1], // single-color LEDs only listen on channel 0 (0x90): Scene Launch 1 on
  // [0x90, 0x71, 0x1], // single-color LEDs only listen on channel 0 (0x90): Scene Launch 2 on
  // [0x90, 0x72, 0x1], // single-color LEDs only listen on channel 0 (0x90): Scene Launch 3 on
  // [0x90, 0x73, 0x1], // single-color LEDs only listen on channel 0 (0x90): Scene Launch 4 on
  // [0x90, 0x74, 0x1], // single-color LEDs only listen on channel 0 (0x90): Scene Launch 5 on
  // [0x90, 0x75, 0x1], // single-color LEDs only listen on channel 0 (0x90): Scene Launch 6 on
  // [0x90, 0x76, 0x1], // single-color LEDs only listen on channel 0 (0x90): Scene Launch 7 on
  // [0x90, 0x77, 0x1], // single-color LEDs only listen on channel 0 (0x90): Scene Launch 8 on
  // [0x90, 0x7a, 0x1], // single-color LEDs only listen on channel 0 (0x90): Shift Button on
];

@Injectable()
export class IoBridgeService implements OnModuleInit {
  private readonly logger = new Logger(IoBridgeService.name);

  public constructor(private readonly eventEmitter: AppEventEmitter) {}

  public onModuleInit(): void {
    // shortcut: every controller shares the APC mapping; per-device mappings are a planned follow-up.
    this.eventEmitter.on('midi.inputMessage', ({ message }) => {
      this.handleMidiMessage(message);
    });

    this.eventEmitter.on('midi.outputOpened', ({ portName }) => {
      // create the outbound events to control the LEDs on the MIDI controller that just connected
      for (const ledMessage of ledMidiMapping) {
        this.eventEmitter.emit('midi.sendMessage', { portName, message: ledMessage });
      }
    });
  }

  private handleMidiMessage(message: MidiMessage): void {
    const [status, data1, data2] = message;

    let dmxValue = 0;
    const dmxChannels = noteDmxMapping[data1] ?? []; // Get DMX channels based on MIDI note number

    if (dmxChannels.length === 0) {
      // If the MIDI note is not mapped, ignore the message
      this.logger.warn(`Received MIDI message with unmapped note: ${data1}. Ignoring.`);
      return;
    }

    if (status >= 128 && status <= 143) {
      // Note Off message
      dmxValue = 0;
    } else if (status >= 144 && status <= 159) {
      // Note On message
      dmxValue = data2; // Use velocity as DMX value
    } else if (status >= 160 && status <= 175) {
      // Poly Key Pressure
      dmxValue = data2; // Use pressure as DMX value
    } else if (status >= 176 && status <= 191) {
      // Control Change
      dmxValue = data2; // Use control value as DMX value
    }

    // normalize DMX value to 0-255
    dmxValue = Math.round((dmxValue / 127) * 255);

    for (const dmxChannel of dmxChannels) {
      this.eventEmitter.emit('dmx.manualValues', [{ channel: dmxChannel, value: dmxValue }]);
    }
  }
}
