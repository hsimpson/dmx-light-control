import { DmxValue } from '@/io/dmx/types/dmx.types';
import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsInt, Max, Min, ValidateNested } from 'class-validator';

@InputType()
export class DmxValueInput implements DmxValue {
  @Field(() => Int, { description: 'The DMX channel number (1-512)' })
  @IsInt()
  @Min(1)
  @Max(512)
  public channel: number;

  @Field(() => Int, { description: 'The DMX channel value (0-255)' })
  @IsInt()
  @Min(0)
  @Max(255)
  public value: number;
}

@InputType()
export class ChannelValuesInput {
  @Field(() => [DmxValueInput], {
    description: 'The list of DMX channel values',
    defaultValue: [{ channel: 1, value: 127 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DmxValueInput)
  public dmxValues: DmxValueInput[];
}
