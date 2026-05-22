import { BaseDto } from '@/db/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';

@ObjectType()
export class VendorResponseDto extends BaseDto {
  @Expose()
  @Field({ description: 'The name of the vendor' })
  public name: string;
}
