import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { UpdateFixtureVendorInput } from './fixture.input';
import { UpdateFixtureChannelDefinitionInput } from './update-fixture-channel-definition.dto';
import { UpdateFixtureChannelModeInput } from './update-fixture-channel-mode.dto';

@InputType()
export class CreateFixtureInput {
  @Field({ description: 'The name of the fixture' })
  @IsString()
  @Length(1, 255)
  public name: string;

  @Field(() => UpdateFixtureVendorInput, { description: 'The vendor of the fixture (existing publicId or new name)' })
  @ValidateNested()
  @Type(() => UpdateFixtureVendorInput)
  public vendor: UpdateFixtureVendorInput;

  @Field(() => [UpdateFixtureChannelDefinitionInput], {
    nullable: true,
    description: 'Channel definitions to create with the fixture',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFixtureChannelDefinitionInput)
  public channelDefinitions?: UpdateFixtureChannelDefinitionInput[];

  @Field(() => [UpdateFixtureChannelModeInput], {
    nullable: true,
    description: 'Channel modes to create with the fixture',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFixtureChannelModeInput)
  public channelModes?: UpdateFixtureChannelModeInput[];
}
