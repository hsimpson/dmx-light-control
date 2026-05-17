import { Controller, Get } from '@nestjs/common';
import { GetMidiDevicesDto } from './dto/get-devices.dto';
import { MidiService } from './midi.service';

@Controller('midi')
export class MidiController {
  public constructor(private readonly midiService: MidiService) {}

  @Get('devices')
  public getInputDevices(): GetMidiDevicesDto {
    const inputDevices = this.midiService.getInputDevices();
    const outputDevices = this.midiService.getOutputDevices();
    return { inputDevices, outputDevices };
  }
}
