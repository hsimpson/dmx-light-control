import { BaseDto } from '@/db/base.dto';
import { FixtureVendorDto } from '@/fixtures/dto/fixture-vendor.dto';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';

@ObjectType()
export class ProjectFixtureChannelAssignmentDto {
  @Field(() => Int, { description: 'The 1-based DMX channel number of the assignment' })
  public channelNumber: number;
}

@ObjectType()
export class ProjectFixtureFixtureDto extends BaseDto {
  @Field({ description: 'The name of the fixture' })
  public name: string;

  @Type(() => FixtureVendorDto)
  @Field(() => FixtureVendorDto, { description: 'The vendor of the fixture' })
  public fixtureVendor: FixtureVendorDto;
}

@ObjectType()
export class ProjectFixtureChannelModeDto extends BaseDto {
  @Field({ description: 'The name of the channel mode' })
  public name: string;

  @Field(() => [ProjectFixtureChannelAssignmentDto], {
    description: 'The channel assignments of the channel mode',
  })
  @Type(() => ProjectFixtureChannelAssignmentDto)
  public fixtureChannelAssignments: ProjectFixtureChannelAssignmentDto[];
}

@ObjectType()
export class ProjectFixtureDto extends BaseDto {
  @Field(() => Int, { description: 'The DMX start address of the patched fixture instance' })
  public startAddress: number;

  @Type(() => ProjectFixtureFixtureDto)
  @Field(() => ProjectFixtureFixtureDto, { description: 'The catalog fixture type of this instance' })
  public fixture: ProjectFixtureFixtureDto;

  @Type(() => ProjectFixtureChannelModeDto)
  @Field(() => ProjectFixtureChannelModeDto, { description: 'The channel mode used for this instance' })
  public channelMode: ProjectFixtureChannelModeDto;
}
