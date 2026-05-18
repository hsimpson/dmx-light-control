import { MidiDevice } from '@/io/midi/types/midi.types';
import { Expose } from 'class-transformer';

export class GetMidiDevicesDto {
  @Expose()
  public inputDevices: MidiDevice[];

  @Expose()
  public outputDevices: MidiDevice[];
}
