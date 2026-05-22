import { BaseDto } from '@/db/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';
import { Expose, Type } from 'class-transformer';
import { VendorResponseDto } from './vendor.response.dto';

@ObjectType()
export class FixtureResponseDto extends BaseDto {
  @Expose()
  @Field({ description: 'The name of the fixture' })
  public name: string;

  @Expose()
  @Type(() => VendorResponseDto)
  @Field(() => VendorResponseDto, { description: 'The vendor of the fixture' })
  public vendor: VendorResponseDto;
}
