import { FIXTURE_ASSETS_ROOT } from '@/fixtures/fixture-asset-path';
import { AnalysedAudio, AudioDecodeError, AudioFileFormat, decodeAudio } from '@/io/audio-file/decode-audio';
import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, open, rm } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { ShowRepository } from './repositories/show.repository';
import { ShowAudioClipRepository } from './repositories/show-audio-clip.repository';
import { ShowNotFoundException } from './show.exceptions';

export const SHOW_AUDIO_MAX_BYTES = 200 * 1024 * 1024;
/** One hour per clip: about 690 MB of stored PCM and 72k waveform peaks. */
export const SHOW_AUDIO_MAX_DURATION_MS = 60 * 60 * 1000;

/** `truncated` is set by multipart when the size limit cut the file short. */
export type UploadedAudioFile = {
  filename: string;
  mimetype: string;
  file: AsyncIterable<Uint8Array> & { truncated: boolean };
};

// Browsers often send no specific type for flac/opus, so octet-stream is accepted; the decoder checks the content.
const GENERIC_MIME = 'application/octet-stream';
const AUDIO_FORMATS: Record<string, { format: AudioFileFormat; mimeTypes: readonly string[] }> = {
  '.mp3': { format: 'mp3', mimeTypes: ['audio/mpeg', 'audio/mp3'] },
  '.wav': { format: 'wav', mimeTypes: ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'] },
  '.flac': { format: 'flac', mimeTypes: ['audio/flac', 'audio/x-flac'] },
  '.ogg': { format: 'oga', mimeTypes: ['audio/ogg', 'application/ogg'] },
  '.opus': { format: 'opus', mimeTypes: ['audio/opus', 'audio/ogg'] },
};

/** Stores show audio as decoded 48 kHz stereo PCM under the assets root, one file per clip. */
@Injectable()
export class ShowAudioService {
  public constructor(
    private readonly showRepository: ShowRepository,
    private readonly audioClipRepository: ShowAudioClipRepository,
    @Inject(FIXTURE_ASSETS_ROOT) private readonly assetsRoot: string,
  ) {}

  /** Appends the file after the last audio clip of the show. */
  public async upload(showPublicId: string, upload: UploadedAudioFile) {
    const format = audioFormat(upload.filename, upload.mimetype);
    const show = await this.showRepository.findLoadedByPublicId(showPublicId);
    if (!show?.id) {
      throw new ShowNotFoundException(showPublicId);
    }
    const publicId = randomUUID();
    const path = this.clipPath(showPublicId, publicId);
    const analysed = await this.decodeToFile(upload, format, path);
    const startMs = Math.max(0, ...show.audioClips.map(clip => clip.startMs + clip.durationMs));
    const fileName = basename(upload.filename).slice(0, 255);
    try {
      return await this.audioClipRepository.createOne({ publicId, showId: show.id, fileName, startMs, ...analysed });
    } catch (error) {
      await rm(path, { force: true });
      throw error;
    }
  }

  public async removeClip(showPublicId: string, clipPublicId: string): Promise<{ publicId: string; deleted: true }> {
    const show = await this.showRepository.findLoadedByPublicId(showPublicId);
    if (!show?.audioClips.some(clip => clip.publicId === clipPublicId)) {
      throw new NotFoundException('Audio clip not found');
    }
    await this.audioClipRepository.deleteOneByPublicId(clipPublicId);
    await rm(this.clipPath(showPublicId, clipPublicId), { force: true });
    return { publicId: clipPublicId, deleted: true };
  }

  public async removeShowFiles(showPublicId: string): Promise<void> {
    await rm(this.showDirectory(showPublicId), { recursive: true, force: true });
  }

  public clipPath(showPublicId: string, clipPublicId: string): string {
    return this.insideAssetsRoot(join(this.showDirectory(showPublicId), `${clipPublicId}.pcm`));
  }

  private showDirectory(showPublicId: string): string {
    return this.insideAssetsRoot(join(this.assetsRoot, 'shows', showPublicId));
  }

  private async decodeToFile(upload: UploadedAudioFile, format: AudioFileFormat, path: string) {
    await mkdir(dirname(path), { recursive: true });
    const handle = await open(path, 'w');
    let analysed: AnalysedAudio;
    try {
      const write = async (pcm: Buffer) => {
        await handle.write(pcm);
      };
      analysed = await decodeAudio(upload.file, format, write, SHOW_AUDIO_MAX_DURATION_MS);
    } catch (error) {
      // Closed before removal: Windows cannot delete a file that is still open.
      await handle.close();
      await rm(path, { force: true });
      throw error instanceof AudioDecodeError ? new BadRequestException('Unsupported or damaged audio file') : error;
    }
    await handle.close();
    const rejection = incompleteUpload(upload, analysed);
    if (rejection) {
      await rm(path, { force: true });
      throw rejection;
    }
    return analysed;
  }

  private insideAssetsRoot(target: string): string {
    const root = resolve(this.assetsRoot);
    const resolved = resolve(target);
    if (!resolved.startsWith(root + sep)) {
      throw new BadRequestException('Invalid show audio path');
    }
    return resolved;
  }
}

function audioFormat(filename: string, mimeType: string): AudioFileFormat {
  const entry = AUDIO_FORMATS[extname(filename).toLowerCase()];
  if (!entry || (mimeType !== GENERIC_MIME && !entry.mimeTypes.includes(mimeType))) {
    throw new BadRequestException('Unsupported audio file type');
  }
  return entry.format;
}

// Multipart ends a too large file early and only flags it, so a cut file would otherwise pass as complete.
function incompleteUpload(upload: UploadedAudioFile, analysed: AnalysedAudio): HttpException | null {
  if (upload.file.truncated) {
    return new PayloadTooLargeException('Audio file is too large');
  }
  if (analysed.durationMs === 0) {
    return new BadRequestException('The audio file contains no audio');
  }
  return null;
}
