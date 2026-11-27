import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import { SHOW_AUDIO_MAX_BYTES, ShowAudioService } from './show-audio.service';
import { ShowNotFoundException } from './show.exceptions';

type MultipartRequest = {
  file: (options: {
    limits: { fileSize: number };
  }) => Promise<{ filename: string; mimetype: string; file: Readable & { truncated: boolean } } | undefined>;
};

const uuid = new ParseUUIDPipe({ version: '4' });

@Controller('shows')
export class ShowAudioController {
  public constructor(private readonly showAudioService: ShowAudioService) {}

  @Post(':publicId/audio')
  public async upload(@Param('publicId', uuid) publicId: string, @Req() request: MultipartRequest) {
    const upload = await request.file({ limits: { fileSize: SHOW_AUDIO_MAX_BYTES } });
    if (!upload) {
      throw new BadRequestException('file is required');
    }
    try {
      return await this.showAudioService.upload(publicId, upload);
    } catch (error) {
      // An unread rest of the upload would keep the request open.
      upload.file.resume();
      throw error instanceof ShowNotFoundException ? new NotFoundException(error.message) : error;
    }
  }

  @Delete(':publicId/audio/:clipPublicId')
  @HttpCode(200)
  public async remove(
    @Param('publicId', uuid) publicId: string,
    @Param('clipPublicId', uuid) clipPublicId: string,
  ): Promise<{ publicId: string; deleted: true }> {
    return this.showAudioService.removeClip(publicId, clipPublicId);
  }
}
