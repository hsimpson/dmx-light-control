import { FixtureAssetService } from '@/fixtures/fixture-asset.service';
import { FixtureNotFoundException } from '@/fixtures/fixture.exceptions';
import { BadRequestException, Controller, Delete, HttpCode, NotFoundException, Param, Post, Req } from '@nestjs/common';

type UploadedMultipartFile = {
  filename: string;
  mimetype: string;
  toBuffer: () => Promise<Buffer>;
};

type MultipartRequest = {
  file: () => Promise<UploadedMultipartFile | undefined>;
};

@Controller('fixtures')
export class FixtureAssetController {
  public constructor(private readonly fixtureAssetService: FixtureAssetService) {}

  @Post(':publicId/assets/:kind')
  public async upload(
    @Param('publicId') publicId: string,
    @Param('kind') kind: string,
    @Req() request: MultipartRequest,
  ): Promise<{ kind: string; path: string }> {
    const file = await request.file();
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const buffer = await file.toBuffer();
    try {
      return await this.fixtureAssetService.upload(publicId, kind, file.filename, file.mimetype, buffer);
    } catch (error) {
      if (error instanceof FixtureNotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Delete(':publicId/assets/:kind')
  @HttpCode(200)
  public async remove(
    @Param('publicId') publicId: string,
    @Param('kind') kind: string,
  ): Promise<{ kind: string; path: null }> {
    try {
      return await this.fixtureAssetService.remove(publicId, kind);
    } catch (error) {
      if (error instanceof FixtureNotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
