import { DmxValue } from '@/io/dmx/types/dmx.types';
import { Expose } from 'class-transformer';

export class SetChannelValuesDto {
  @Expose()
  public dmxValues: DmxValue[];
}
