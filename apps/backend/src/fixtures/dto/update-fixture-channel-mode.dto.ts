import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUUID, Length, ValidateNested } from 'class-validator';
import { GraphQLUUID } from 'graphql-scalars';
import { UpdateFixtureChannelAssignmentInput } from './update-fixture-channel-assignment.dto';

@InputType()
export class UpdateFixtureChannelModeInput {
  @Field(() => GraphQLUUID, {
    nullable: true,
    description: 'The public ID of an existing channel mode; omit to create',
  })
  @IsOptional()
  @IsUUID('4')
  public publicId?: string;

  @Field({ description: 'The name of the channel mode' })
  @IsString()
  @Length(1, 255)
  public name: string;

  @Field(() => [UpdateFixtureChannelAssignmentInput], {
    description: 'The channel assignments of the channel mode, in channel-number order',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFixtureChannelAssignmentInput)
  public assignments: UpdateFixtureChannelAssignmentInput[];
}
