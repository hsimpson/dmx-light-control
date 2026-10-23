import { IoDeviceInput } from '@/io/devices/dto/io-device.dto';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsUUID, ValidateNested } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';

export const PROJECT_IO_DEVICES_MAX = 32;

@InputType()
export class UpdateProjectIoDevicesInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project' })
  @IsUUID('4')
  public publicId: string;

  @Field(() => [IoDeviceInput], { description: 'The complete list of input/output devices used by the project' })
  @ArrayMaxSize(PROJECT_IO_DEVICES_MAX)
  @ValidateNested({ each: true })
  @Type(() => IoDeviceInput)
  public ioDevices: IoDeviceInput[];
}
