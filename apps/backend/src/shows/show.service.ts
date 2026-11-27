import { isPostgresUniqueViolation } from '@/db/postgres-errors';
import { ProjectNotFoundException } from '@/projects/project.exceptions';
import { ProjectFunctionRepository } from '@/projects/repositories/project-function.repository';
import { ProjectRepository } from '@/projects/repositories/project.repository';
import { Injectable } from '@nestjs/common';
import { AddShowInput, ShowAudioClipPositionInput, UpdateShowInput } from './dto/show.dto';
import { LoadedShow, ShowRepository } from './repositories/show.repository';
import { ShowAudioClipRepository } from './repositories/show-audio-clip.repository';
import { audioClipsOverlap, clipFunctionIds, showBeatsMs, showDurationMs, ShowLightTrack } from './show';
import { ShowAudioService } from './show-audio.service';
import { InvalidShowException, ShowNameExistsException, ShowNotFoundException } from './show.exceptions';

export function mapShowToDto(show: LoadedShow) {
  return {
    ...show,
    beatsMs: showBeatsMs(show.audioClips),
    durationMs: showDurationMs(show.audioClips, show.lightTracks),
  };
}

@Injectable()
export class ShowService {
  public constructor(
    private readonly showRepository: ShowRepository,
    private readonly audioClipRepository: ShowAudioClipRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly projectFunctionRepository: ProjectFunctionRepository,
    private readonly showAudioService: ShowAudioService,
  ) {}

  public async listShows(projectPublicId: string) {
    const project = await this.projectRepository.findOneByPublicId(projectPublicId);
    if (!project?.id) {
      throw new ProjectNotFoundException(projectPublicId);
    }
    const shows = await this.showRepository.listByProjectId(project.id);
    return shows.map(mapShowToDto);
  }

  public async addShow(input: AddShowInput) {
    const project = await this.projectRepository.findOneByPublicId(input.projectPublicId);
    if (!project?.id) {
      throw new ProjectNotFoundException(input.projectPublicId);
    }
    const projectId = project.id;
    const name = input.name.trim();
    const created = await this.withUniqueName(name, async () => this.showRepository.createOne({ projectId, name }));
    if (!created?.publicId) {
      throw new ShowNotFoundException(name);
    }
    return this.loadShow(created.publicId);
  }

  public async updateShow(input: UpdateShowInput) {
    const existing = await this.loadShow(input.publicId);
    if (input.lightTracks) {
      await this.assertProjectFunctions(existing.projectId, input.lightTracks);
    }
    if (input.audioClips) {
      this.assertAudioPositions(existing, input.audioClips);
    }
    const name = input.name?.trim();
    // Drizzle rejects an update without values, e.g. when only audio clips move.
    if (name !== undefined || input.lightTracks) {
      await this.withUniqueName(name ?? existing.name, async () =>
        this.showRepository.updateOneByPublicId(input.publicId, { name, lightTracks: input.lightTracks }),
      );
    }
    if (input.audioClips) {
      await this.audioClipRepository.updateStarts(input.audioClips);
    }
    return this.loadShow(input.publicId);
  }

  public async deleteShow(publicId: string): Promise<{ publicId: string; deleted: boolean }> {
    const deleted = await this.showRepository.deleteAndUnbind(publicId);
    if (deleted) {
      await this.showAudioService.removeShowFiles(publicId);
    }
    return { publicId, deleted };
  }

  private async loadShow(publicId: string) {
    const show = await this.showRepository.findLoadedByPublicId(publicId);
    if (!show) {
      throw new ShowNotFoundException(publicId);
    }
    return mapShowToDto(show);
  }

  private async withUniqueName<T>(name: string, write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ShowNameExistsException(name);
      }
      throw error;
    }
  }

  private async assertProjectFunctions(projectId: number, lightTracks: readonly ShowLightTrack[]): Promise<void> {
    const functions = await this.projectFunctionRepository.listByProjectId(projectId);
    const known = new Set(functions.map(fn => fn.publicId));
    const unknown = [...clipFunctionIds(lightTracks)].filter(id => !known.has(id));
    if (unknown.length > 0) {
      throw new InvalidShowException(`Functions ${unknown.join(', ')} do not belong to this project.`);
    }
  }

  private assertAudioPositions(show: LoadedShow, positions: readonly ShowAudioClipPositionInput[]): void {
    const starts = new Map(positions.map(position => [position.publicId, position.startMs]));
    const unknown = [...starts.keys()].filter(id => !show.audioClips.some(clip => clip.publicId === id));
    if (unknown.length > 0) {
      throw new InvalidShowException(`Audio clips ${unknown.join(', ')} do not belong to this show.`);
    }
    const moved = show.audioClips.map(clip => {
      const startMs = clip.publicId === null ? undefined : starts.get(clip.publicId);
      return { ...clip, startMs: startMs ?? clip.startMs };
    });
    if (audioClipsOverlap(moved)) {
      throw new InvalidShowException('Audio clips must not overlap.');
    }
  }
}
