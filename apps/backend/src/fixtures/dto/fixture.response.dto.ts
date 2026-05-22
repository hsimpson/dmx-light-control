import { BaseDto } from '@/db/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { VendorResponseDto } from './vendor.response.dto';

@ObjectType()
export class FixtureResponseDto extends BaseDto {
  @Field({ description: 'The name of the fixture' })
  public name: string;

  @Type(() => VendorResponseDto)
  @Field(() => VendorResponseDto, { description: 'The vendor of the fixture' })
  public vendor: VendorResponseDto;
}
