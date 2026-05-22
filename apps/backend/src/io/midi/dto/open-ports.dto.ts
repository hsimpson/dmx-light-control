import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';

@InputType()
export class OpenPortsInput {
  @Field(() => Int, {
    description: 'The MIDI input port number to open',
    defaultValue: 0,
  })
  @IsInt()
  @Min(0)
  public inputPort: number;

  @Field(() => Int, {
    description: 'The MIDI output port number to open',
    defaultValue: 0,
  })
  @IsInt()
  @Min(0)
  public outputPort: number;
}
