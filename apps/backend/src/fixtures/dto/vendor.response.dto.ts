import { BaseDto } from '@/db/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VendorResponseDto extends BaseDto {
  @Field({ description: 'The name of the vendor' })
  public name: string;
}
