import { BaseDto } from '@/db/base.dto';
import { Expose } from 'class-transformer';

export class VendorResponseDto extends BaseDto {
  @Expose()
  public name: string;
}
