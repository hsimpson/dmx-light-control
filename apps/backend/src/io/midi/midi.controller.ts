import { Body, Controller, Get, Put } from '@nestjs/common';
import { GetMidiDevicesDto } from './dto/get-devices.dto';
import { OpenPortsDto } from './dto/open-ports.dto';
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

  @Put('open-ports')
  public openPorts(@Body() openPortsDto: OpenPortsDto): void {
    this.midiService.openPorts(openPortsDto);
  }

  @Put('close-ports')
  public closePorts(): void {
    this.midiService.closePorts();
  }
}
