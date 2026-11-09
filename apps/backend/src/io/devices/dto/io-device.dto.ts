import type { SoundInputChannels } from '@/io/sound-input/sound-input.service';
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateBy,
  ValidateIf,
} from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';
import { IoDeviceKind, IoDeviceStatus } from '../match-io-devices';

@ObjectType()
export class IoDeviceDto {
  @Field(() => IoDeviceKind, { description: 'Device kind (DMX serial output, MIDI controller or sound input)' })
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

  @Field(() => Int, { nullable: true, description: 'Captured channels of a sound input: 1 (mono) or 2 (stereo)' })
  public audioChannels: SoundInputChannels | null;

  @Field(() => Int, {
    nullable: true,
    description: 'Highest channel count a sound input can capture; only set on available devices',
  })
  public maxInputChannels: number | null;
}

@ObjectType()
export class IoDeviceStateDto extends IoDeviceDto {
  @Field(() => IoDeviceStatus, { description: 'Whether the configured device is currently connected' })
  public status: IoDeviceStatus;
}

const USB_ID_PATTERN = /^[0-9a-f]{4}$/;
const USB_LOCATION_PATTERN = /^[A-Za-z0-9_#.:&-]{1,64}$/;
const USB_TEXT_MAX_LENGTH = 255;
const SOUND_INPUT_CHANNELS: readonly SoundInputChannels[] = [1, 2];

@InputType()
export class IoDeviceInput {
  @Field(() => IoDeviceKind, { description: 'Device kind (DMX serial output, MIDI controller or sound input)' })
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

  @Field(() => Int, { nullable: true, description: 'Captured channels of a sound input: 1 (mono) or 2 (stereo)' })
  @ValidateIf(
    (device: IoDeviceInput) => device.kind === IoDeviceKind.SoundInput || (device.audioChannels ?? null) !== null,
  )
  @IsIn(SOUND_INPUT_CHANNELS)
  public audioChannels?: SoundInputChannels | null;
}

/** A project captures from at most one sound input. */
export function AtMostOneSoundInput(): PropertyDecorator {
  return ValidateBy({
    name: 'atMostOneSoundInput',
    validator: {
      validate: (devices: unknown) => !Array.isArray(devices) || devices.filter(isSoundInputDevice).length <= 1,
      defaultMessage: () => 'a project can have at most one sound input',
    },
  });
}

function isSoundInputDevice(device: unknown): boolean {
  return typeof device === 'object' && device !== null && 'kind' in device && device.kind === IoDeviceKind.SoundInput;
}
