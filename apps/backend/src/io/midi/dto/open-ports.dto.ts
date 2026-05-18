import { Expose } from 'class-transformer';

export class OpenPortsDto {
  @Expose()
  public inputPort: number;

  @Expose()
  public outputPort: number;
}
