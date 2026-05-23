import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { plainToInstance } from 'class-transformer';
import { MidiDevicesDto } from './dto/get-devices.dto';
import { OpenPortsInput } from './dto/open-ports.dto';
import { MidiService } from './midi.service';

@Resolver()
export class MidiResolver {
  public constructor(private readonly midiService: MidiService) {}

  @Query(() => MidiDevicesDto, {
    name: 'getMidiDevices',
    description: 'Get the list of MIDI input and output devices',
  })
  public getInputDevices(): MidiDevicesDto {
    const inputDevices = this.midiService.getInputDevices();
    const outputDevices = this.midiService.getOutputDevices();
    return plainToInstance(MidiDevicesDto, { inputDevices, outputDevices });
  }

  @Mutation(() => Boolean, {
    name: 'openPorts',
    description: 'Open the specified MIDI ports',
    nullable: true,
  })
  public openPorts(
    @Args('openPortsDto', { type: () => OpenPortsInput })
    openPortsDto: OpenPortsInput,
  ): boolean {
    this.midiService.openPorts(openPortsDto);
    return true;
  }

  @Mutation(() => Boolean, {
    name: 'closePorts',
    description: 'Close the specified MIDI ports',
    nullable: true,
  })
  public closePorts(): boolean {
    this.midiService.closePorts();
    return true;
  }
}
