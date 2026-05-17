import { Expose } from 'class-transformer';

export class GetMidiDevicesDto {
  @Expose()
  public inputDevices: string[];

  @Expose()
  public outputDevices: string[];
}
