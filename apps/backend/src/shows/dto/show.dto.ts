import { BaseDto } from '@/db/base.dto';
import { Field, Float, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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

/** Twelve hours: far beyond any show, small enough that sums of positions stay exact integers. */
const MAX_SHOW_MS = 12 * 60 * 60 * 1000;
const MAX_LIGHT_TRACKS = 64;
const MAX_CLIPS_PER_TRACK = 2000;
const MAX_AUDIO_CLIPS = 200;
const MAX_CUES = 500;

@ObjectType()
export class ShowLightClipDto {
  @Field({ description: 'Client-generated id of the clip, unique within the show' })
  public id: string;

  @Field(() => GraphQLUUID, { description: 'The project function this clip plays' })
  public functionPublicId: string;

  @Field(() => Int, { description: 'Start on the show timeline in milliseconds' })
  public startMs: number;

  @Field(() => Int, { description: 'Length of the clip in milliseconds' })
  public durationMs: number;

  @Field({ description: 'True steps the function on every beat of the show instead of letting it run free' })
  public followBeat: boolean;
}

@ObjectType()
export class ShowLightTrackDto {
  @Field({ description: 'Client-generated id of the track, unique within the show' })
  public id: string;

  @Field({ description: 'Display name of the track' })
  public name: string;

  @Field(() => [ShowLightClipDto], { description: 'Function clips on this track; they may overlap' })
  @Type(() => ShowLightClipDto)
  public clips: ShowLightClipDto[];
}

@ObjectType()
export class ShowCueDto {
  @Field({ description: 'Client-generated id of the cue, unique within the show' })
  public id: string;

  @Field({ description: 'Display name of the cue' })
  public name: string;

  @Field(() => Int, { description: 'Position on the show timeline in milliseconds' })
  public ms: number;
}

@ObjectType()
export class ShowAudioClipDto extends BaseDto {
  @Field({ description: 'Original name of the uploaded audio file' })
  public fileName: string;

  @Field(() => Int, { description: 'Start on the show timeline in milliseconds' })
  public startMs: number;

  @Field(() => Int, { description: 'Length of the decoded audio in milliseconds' })
  public durationMs: number;

  @Field(() => [Int], { description: 'Detected beats in milliseconds from the start of the clip' })
  public beatsMs: number[];

  @Field(() => [Float], { description: 'Waveform peaks from 0 to 1, 20 per second' })
  public peaks: number[];
}

@ObjectType()
export class ShowDto extends BaseDto {
  @Field({ description: 'The unique name of this show within the project' })
  public name: string;

  @Field(() => [ShowAudioClipDto], { description: 'Clips of the single audio track, ordered by start' })
  @Type(() => ShowAudioClipDto)
  public audioClips: ShowAudioClipDto[];

  @Field(() => [ShowLightTrackDto], { description: 'Light tracks in display order' })
  @Type(() => ShowLightTrackDto)
  public lightTracks: ShowLightTrackDto[];

  @Field(() => [ShowCueDto], { description: 'Cue points on the show timeline, ascending by position' })
  @Type(() => ShowCueDto)
  public cues: ShowCueDto[];

  @Field(() => [Int], { description: 'Every audio beat on the show timeline in milliseconds, ascending' })
  public beatsMs: number[];

  @Field(() => Int, { description: 'End of the last clip in milliseconds' })
  public durationMs: number;
}

@InputType()
export class ShowLightClipInput {
  @Field({ description: 'Client-generated id of the clip, unique within the show' })
  @IsString()
  @Length(1, 64)
  public id: string;

  @Field(() => GraphQLUUID, { description: 'The project function this clip plays' })
  @IsUUID('4')
  public functionPublicId: string;

  @Field(() => Int, { description: 'Start on the show timeline in milliseconds' })
  @IsInt()
  @Min(0)
  @Max(MAX_SHOW_MS)
  public startMs: number;

  @Field(() => Int, { description: 'Length of the clip in milliseconds' })
  @IsInt()
  @Min(1)
  @Max(MAX_SHOW_MS)
  public durationMs: number;

  @Field({ description: 'True steps the function on every beat of the show instead of letting it run free' })
  @IsBoolean()
  public followBeat: boolean;
}

@InputType()
export class ShowLightTrackInput {
  @Field({ description: 'Client-generated id of the track, unique within the show' })
  @IsString()
  @Length(1, 64)
  public id: string;

  @Field({ description: 'Display name of the track' })
  @IsString()
  @Length(0, 255)
  public name: string;

  @Field(() => [ShowLightClipInput], { description: 'Function clips on this track; they may overlap' })
  @IsArray()
  @ArrayMaxSize(MAX_CLIPS_PER_TRACK)
  @ValidateNested({ each: true })
  @Type(() => ShowLightClipInput)
  public clips: ShowLightClipInput[];
}

@InputType()
export class ShowCueInput {
  @Field({ description: 'Client-generated id of the cue, unique within the show' })
  @IsString()
  @Length(1, 64)
  public id: string;

  @Field({ description: 'Display name of the cue' })
  @IsString()
  @Length(0, 64)
  public name: string;

  @Field(() => Int, { description: 'Position on the show timeline in milliseconds' })
  @IsInt()
  @Min(0)
  @Max(MAX_SHOW_MS)
  public ms: number;
}

@InputType()
export class ShowAudioClipPositionInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of an audio clip of this show' })
  @IsUUID('4')
  public publicId: string;

  @Field(() => Int, { description: 'New start on the show timeline in milliseconds' })
  @IsInt()
  @Min(0)
  @Max(MAX_SHOW_MS)
  public startMs: number;
}

@InputType()
export class AddShowInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the project' })
  @IsUUID('4')
  public projectPublicId: string;

  @Field({ description: 'Unique name within the project' })
  @IsString()
  @Length(1, 255)
  public name: string;
}

@InputType()
export class UpdateShowInput {
  @Field(() => GraphQLUUID, { description: 'The public ID of the show' })
  @IsUUID('4')
  public publicId: string;

  @Field({ nullable: true, description: 'Unique name within the project' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  public name?: string;

  @Field(() => [ShowLightTrackInput], {
    nullable: true,
    description: 'Replacement light tracks. Replaces every track and clip.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_LIGHT_TRACKS)
  @ValidateNested({ each: true })
  @Type(() => ShowLightTrackInput)
  public lightTracks?: ShowLightTrackInput[];

  @Field(() => [ShowCueInput], { nullable: true, description: 'Replacement cue points. Replaces every cue.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_CUES)
  @ValidateNested({ each: true })
  @Type(() => ShowCueInput)
  public cues?: ShowCueInput[];

  @Field(() => [ShowAudioClipPositionInput], {
    nullable: true,
    description: 'New start positions of audio clips; clips not listed keep their position',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_AUDIO_CLIPS)
  @ValidateNested({ each: true })
  @Type(() => ShowAudioClipPositionInput)
  public audioClips?: ShowAudioClipPositionInput[];
}

@ObjectType()
export class DeleteShowPayload {
  @Field(() => GraphQLUUID, { description: 'The public id of the show that was requested for deletion' })
  public publicId: string;

  @Field({ description: 'True if a show was deleted, false if no show matched the public id' })
  public deleted: boolean;
}
