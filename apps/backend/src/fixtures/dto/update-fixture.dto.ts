import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUUID, Length, ValidateNested } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';
import { UpdateFixtureVendorInput } from './fixture.input';
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
