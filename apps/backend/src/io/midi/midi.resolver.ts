import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { plainToInstance } from 'class-transformer';
import { GraphQLVoid } from 'graphql-scalars';
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
    console.log('MIDI input devices:', inputDevices);
    console.log('MIDI output devices:', outputDevices);
    return plainToInstance(MidiDevicesDto, { inputDevices, outputDevices });
  }

  @Mutation(() => GraphQLVoid, {
    name: 'openPorts',
    description: 'Open the specified MIDI ports',
  })
  public openPorts(
    @Args('openPortsDto', { type: () => OpenPortsInput })
    openPortsDto: OpenPortsInput,
  ): null {
    this.midiService.openPorts(openPortsDto);
    return null;
  }

  @Mutation(() => GraphQLVoid, {
    name: 'closePorts',
    description: 'Close the specified MIDI ports',
  })
  public closePorts(): null {
    this.midiService.closePorts();
    return null;
  }
}
