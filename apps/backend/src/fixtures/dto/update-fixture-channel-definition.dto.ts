import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';
import { FixtureChannelPreset } from '../channel-presets';
import { UpdateFixtureChannelRangeInput } from './update-fixture-channel-range.dto';

@InputType()
export class UpdateFixtureChannelDefinitionInput {
  @Field(() => GraphQLUUID, {
    nullable: true,
    description: 'The public ID of the channel definition. Omit to create a new channel definition.',
  })
  @IsOptional()
  @IsUUID('4')
  public publicId?: string;

  @Field({ description: 'The new name of the channel definition' })
  @IsString()
  @Length(1, 255)
  public name: string;

  @Field(() => FixtureChannelPreset, {
    nullable: true,
    description: 'The new preset of the channel definition',
  })
  @IsOptional()
  @IsEnum(FixtureChannelPreset)
  public preset?: FixtureChannelPreset;

  @Field(() => Int, {
    nullable: true,
    description: 'The new order of the channel definition; omit to leave the order unchanged',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(255)
  public order?: number;

  @Field(() => [UpdateFixtureChannelRangeInput], {
    nullable: true,
    description: 'Replace the channel ranges of the definition when provided; omit to leave ranges unchanged',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFixtureChannelRangeInput)
  public ranges?: UpdateFixtureChannelRangeInput[];
}
