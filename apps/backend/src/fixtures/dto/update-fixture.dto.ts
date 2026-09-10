import { Field, Float, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateNested } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';
import { UpdateFixtureVendorInput } from './fixture.input';
import { UpdateFixtureChannelDefinitionInput } from './update-fixture-channel-definition.dto';
import { UpdateFixtureChannelModeInput } from './update-fixture-channel-mode.dto';

@InputType()
export class UpdateFixtureInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the fixture' })
  @IsUUID('4')
  public publicId: string;

  @Field({ nullable: true, description: 'The name of the fixture' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  public name?: string;

  @Field(() => UpdateFixtureVendorInput, { nullable: true, description: 'The vendor of the fixture' })
  @IsOptional()
  public vendor?: UpdateFixtureVendorInput;

  @Field(() => Float, { nullable: true, description: 'Fixture weight in kilograms' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  public weight?: number | null;

  @Field(() => Float, { nullable: true, description: 'Fixture width in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  @Max(100)
  public width?: number | null;

  @Field(() => Float, { nullable: true, description: 'Fixture length in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  @Max(100)
  public length?: number | null;

  @Field(() => Float, { nullable: true, description: 'Fixture height in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  @Max(100)
  public height?: number | null;

  @Field(() => [UpdateFixtureChannelDefinitionInput], {
    nullable: true,
    description: 'Rename fixture channel definitions when provided; omit to leave definition names unchanged',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFixtureChannelDefinitionInput)
  public channelDefinitions?: UpdateFixtureChannelDefinitionInput[];

  @Field(() => [UpdateFixtureChannelModeInput], {
    nullable: true,
    description: 'Replace the fixture channel modes when provided; omit to leave modes unchanged',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFixtureChannelModeInput)
  public channelModes?: UpdateFixtureChannelModeInput[];
}
