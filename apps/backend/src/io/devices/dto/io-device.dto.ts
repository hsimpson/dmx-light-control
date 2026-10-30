import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';
import { IoDeviceKind, IoDeviceStatus } from '../match-io-devices';

@ObjectType()
export class IoDeviceDto {
  @Field(() => IoDeviceKind, { description: 'Device kind (DMX serial output or MIDI controller)' })
  public kind: IoDeviceKind;

  @Field({ description: 'USB product name' })
  public name: string;

  @Field(() => String, { nullable: true, description: 'USB manufacturer name' })
  public manufacturer: string | null;

  @Field(() => String, { nullable: true, description: 'USB serial number' })
  public serial: string | null;

  @Field(() => String, { nullable: true, description: 'USB vendor id (4 lowercase hex digits)' })
  public vendorId: string | null;

  @Field(() => String, { nullable: true, description: 'USB product id (4 lowercase hex digits)' })
  public productId: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'OS-specific USB port location; only used to tell identical devices apart',
  })
  public usbLocation: string | null;

  @Field(() => GraphQLUUID, {
    nullable: true,
    description: 'Public ID of the MIDI mapping assigned to this MIDI device in the project',
  })
  public midiMappingPublicId: string | null;
}

@ObjectType()
export class IoDeviceStateDto extends IoDeviceDto {
  @Field(() => IoDeviceStatus, { description: 'Whether the configured device is currently connected' })
  public status: IoDeviceStatus;
}

const USB_ID_PATTERN = /^[0-9a-f]{4}$/;
const USB_LOCATION_PATTERN = /^[A-Za-z0-9_#.:&-]{1,64}$/;
const USB_TEXT_MAX_LENGTH = 255;

@InputType()
export class IoDeviceInput {
  @Field(() => IoDeviceKind, { description: 'Device kind (DMX serial output or MIDI controller)' })
  @IsEnum(IoDeviceKind)
  public kind: IoDeviceKind;

  @Field({ description: 'USB product name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(USB_TEXT_MAX_LENGTH)
  public name: string;

  @Field(() => String, { nullable: true, description: 'USB manufacturer name' })
  @IsOptional()
  @IsString()
  @MaxLength(USB_TEXT_MAX_LENGTH)
  public manufacturer: string | null;

  @Field(() => String, { nullable: true, description: 'USB serial number' })
  @IsOptional()
  @IsString()
  @MaxLength(USB_TEXT_MAX_LENGTH)
  public serial: string | null;

  @Field(() => String, { nullable: true, description: 'USB vendor id (4 lowercase hex digits)' })
  @IsOptional()
  @Matches(USB_ID_PATTERN, { message: 'vendorId must be 4 lowercase hex digits' })
  public vendorId: string | null;

  @Field(() => String, { nullable: true, description: 'USB product id (4 lowercase hex digits)' })
  @IsOptional()
  @Matches(USB_ID_PATTERN, { message: 'productId must be 4 lowercase hex digits' })
  public productId: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'OS-specific USB port location; only used to tell identical devices apart',
  })
  @IsOptional()
  @Matches(USB_LOCATION_PATTERN, { message: 'usbLocation contains unsupported characters' })
  public usbLocation: string | null;

  @Field(() => GraphQLUUID, {
    nullable: true,
    description: 'Public ID of the MIDI mapping assigned to this MIDI device in the project',
  })
  @IsOptional()
  @IsUUID('4')
  public midiMappingPublicId?: string | null;
}
