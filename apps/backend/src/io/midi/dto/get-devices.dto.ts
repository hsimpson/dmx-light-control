import { Field, Int, ObjectType } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';

@ObjectType()
export class MidiDeviceDto {
  @Field(() => Int, { description: 'The port number of the MIDI device' })
  @IsInt()
  @Min(0)
  public port: number;

  @Field({ description: 'The name of the MIDI device' })
  public name: string;
}

@ObjectType()
export class MidiDevicesDto {
  @Field(() => [MidiDeviceDto], {
    description: 'The list of MIDI input devices',
  })
  public inputDevices: MidiDeviceDto[];

  @Field(() => [MidiDeviceDto], {
    description: 'The list of MIDI output devices',
  })
  public outputDevices: MidiDeviceDto[];
}
