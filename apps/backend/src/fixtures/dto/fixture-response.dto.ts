import { BaseDto } from '@/db/base.dto';
import { Expose, Type } from 'class-transformer';
import { VendorResponseDto } from './vendor-response.dto';

export class FixtureResponseDto extends BaseDto {
  @Expose()
  public name: string;

  @Expose()
  @Type(() => VendorResponseDto)
  public vendor: VendorResponseDto;
}
