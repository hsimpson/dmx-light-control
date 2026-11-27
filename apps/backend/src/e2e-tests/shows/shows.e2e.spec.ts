import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { kickTrackWav } from '@/testhelpers/wav';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import gql from 'graphql-tag';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type Show = {
  publicId: string;
  name: string;
  durationMs: number;
  beatsMs: number[];
  audioClips: { publicId: string; fileName: string; startMs: number; durationMs: number; peaks: number[] }[];
  lightTracks: { id: string; clips: { id: string; functionPublicId: string; followBeat: boolean }[] }[];
  cues: { id: string; name: string; ms: number }[];
};

const SHOW_FIELDS = gql`
  fragment ShowFields on ShowDto {
    publicId
    name
    durationMs
    beatsMs
    audioClips {
      publicId
      fileName
      startMs
      durationMs
      peaks
    }
    lightTracks {
      id
      clips {
        id
        functionPublicId
        followBeat
      }
    }
    cues {
      id
      name
      ms
    }
  }
`;

function audioMultipart(filename: string, contentType: string, content: Buffer) {
  const boundary = '----showAudioBoundary';
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  return {
    payload: Buffer.concat([header, content, Buffer.from(`\r\n--${boundary}--\r\n`)]),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
}

describe('Shows', () => {
  let app: NestFastifyApplication;
  let assetsRoot: string;
  let projectPublicId: string;
  let functionPublicId: string;

  const server = () => app.getHttpAdapter().getInstance().server;
  const inject = () => app.getHttpAdapter().getInstance();

  async function updateShow(input: Record<string, unknown>) {
    return graphqlQuery<{ updateShow: Show }>(
      server(),
      gql`
        mutation ($input: UpdateShowInput!) {
          updateShow(input: $input) {
            ...ShowFields
          }
        }
        ${SHOW_FIELDS}
      `,
      { variables: { input } },
    );
  }

  async function uploadWav(showPublicId: string, filename = 'kicks.wav') {
    const multipart = audioMultipart(filename, 'audio/wav', kickTrackWav(44100, 3000, 500, 500));
    return inject().inject({
      method: 'POST',
      url: `/shows/${showPublicId}/audio`,
      payload: multipart.payload,
      headers: multipart.headers,
    });
  }

  beforeAll(async () => {
    assetsRoot = await mkdtemp(join(tmpdir(), 'show-audio-e2e-'));
    process.env.FIXTURE_ASSETS_ROOT = assetsRoot;
    app = await createE2eApp();
    const created = await graphqlQuery<{ createProject: { publicId: string } }>(
      server(),
      gql`
        mutation ($input: CreateProjectInput!) {
          createProject(input: $input) {
            publicId
          }
        }
      `,
      { variables: { input: { name: `Shows ${Date.now()}` } } },
    );
    projectPublicId = created.data?.createProject.publicId ?? '';
    const added = await graphqlQuery<{ addProjectFunction: { publicId: string } }>(
      server(),
      gql`
        mutation ($input: AddProjectFunctionInput!) {
          addProjectFunction(input: $input) {
            publicId
          }
        }
      `,
      {
        variables: {
          input: {
            projectPublicId,
            name: 'Chase',
            type: 'Sequence',
            sequence: { direction: 'Forward', runOrder: 'Loop', steps: [] },
          },
        },
      },
    );
    functionPublicId = added.data?.addProjectFunction.publicId ?? '';
  });

  afterAll(async () => {
    await app.close();
    await rm(assetsRoot, { recursive: true, force: true });
    delete process.env.FIXTURE_ASSETS_ROOT;
  });

  async function addShow(name: string): Promise<Show> {
    const added = await graphqlQuery<{ addShow: Show }>(
      server(),
      gql`
        mutation ($input: AddShowInput!) {
          addShow(input: $input) {
            ...ShowFields
          }
        }
        ${SHOW_FIELDS}
      `,
      { variables: { input: { projectPublicId, name } } },
    );
    expect(added.errors).toBeUndefined();
    const show = added.data?.addShow;
    if (!show) throw new Error('addShow returned no show');
    return show;
  }

  it('GIVEN a show WHEN two WAVs are uploaded THEN they are decoded, analysed and queued one after the other', async () => {
    const show = await addShow('Opening');

    const first = await uploadWav(show.publicId);
    const second = await uploadWav(show.publicId, 'second.wav');

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    const shows = await graphqlQuery<{ shows: Show[] }>(
      server(),
      gql`
        query ($projectPublicId: UUID!) {
          shows(projectPublicId: $projectPublicId) {
            ...ShowFields
          }
        }
        ${SHOW_FIELDS}
      `,
      { variables: { projectPublicId } },
    );
    const loaded = shows.data?.shows.find(candidate => candidate.publicId === show.publicId);
    expect(loaded?.audioClips.map(clip => [clip.fileName, clip.startMs, clip.durationMs])).toEqual([
      ['kicks.wav', 0, 3000],
      ['second.wav', 3000, 3000],
    ]);
    expect(loaded?.audioClips[0]?.peaks).toHaveLength(60);
    expect(loaded?.beatsMs).toHaveLength(10);
    expect(loaded?.beatsMs[5]).toBeGreaterThan(3000);
    expect(loaded?.durationMs).toBe(6000);
    const pcm = await stat(join(assetsRoot, 'shows', show.publicId, `${loaded?.audioClips[0]?.publicId}.pcm`));
    expect(pcm.size).toBeGreaterThan(3 * 48000 * 4 - 16);
  });

  it('GIVEN a file that is no audio WHEN uploaded THEN it is rejected and nothing is stored', async () => {
    const show = await addShow('Broken');
    const multipart = audioMultipart('fake.mp3', 'audio/mpeg', Buffer.from('definitely not an mp3 frame'));

    const response = await inject().inject({
      method: 'POST',
      url: `/shows/${show.publicId}/audio`,
      payload: multipart.payload,
      headers: multipart.headers,
    });

    expect(response.statusCode).toBe(400);
    const directory = join(assetsRoot, 'shows', show.publicId);
    expect(existsSync(directory) ? await readdir(directory) : []).toEqual([]);
  });

  it('GIVEN a disallowed file type WHEN uploaded THEN it is rejected before decoding', async () => {
    const show = await addShow('Image');
    const multipart = audioMultipart('cover.png', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const response = await inject().inject({
      method: 'POST',
      url: `/shows/${show.publicId}/audio`,
      payload: multipart.payload,
      headers: multipart.headers,
    });

    expect(response.statusCode).toBe(400);
  });

  it('GIVEN an unknown show WHEN audio is uploaded THEN it answers 404', async () => {
    const response = await uploadWav('5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b');

    expect(response.statusCode).toBe(404);
  });

  it('GIVEN cue points WHEN saved THEN they come back by time and replace the previous ones', async () => {
    const show = await addShow('Cues');

    const saved = await updateShow({
      publicId: show.publicId,
      cues: [
        { id: 'b', name: 'Chorus', ms: 30000 },
        { id: 'a', name: 'Intro', ms: 0 },
      ],
    });
    const replaced = await updateShow({ publicId: show.publicId, cues: [{ id: 'c', name: 'Drop', ms: 1000 }] });

    expect(saved.data?.updateShow.cues.map(cue => cue.name)).toEqual(['Intro', 'Chorus']);
    expect(saved.data?.updateShow.durationMs).toBe(0);
    expect(replaced.data?.updateShow.cues).toEqual([{ id: 'c', name: 'Drop', ms: 1000 }]);
  });

  it('GIVEN a cue beyond twelve hours WHEN saved THEN it is rejected', async () => {
    const show = await addShow('Late cue');

    const saved = await updateShow({
      publicId: show.publicId,
      cues: [{ id: 'x', name: 'Too late', ms: 12 * 3600 * 1000 + 1 }],
    });

    expect(saved.errors).toBeDefined();
  });

  it('GIVEN light tracks WHEN the function is deleted THEN its clips leave the show', async () => {
    const show = await addShow('Tracks');
    const saved = await updateShow({
      publicId: show.publicId,
      lightTracks: [
        {
          id: 't1',
          name: 'Front',
          clips: [{ id: 'c1', functionPublicId, startMs: 0, durationMs: 4000, followBeat: true }],
        },
      ],
    });
    expect(saved.data?.updateShow.lightTracks[0]?.clips).toHaveLength(1);
    expect(saved.data?.updateShow.durationMs).toBe(4000);

    await graphqlQuery(
      server(),
      gql`
        mutation ($publicId: UUID!) {
          deleteProjectFunction(publicId: $publicId) {
            deleted
          }
        }
      `,
      { variables: { publicId: functionPublicId } },
    );

    const reloaded = await updateShow({ publicId: show.publicId });
    expect(reloaded.data?.updateShow.lightTracks).toEqual([{ id: 't1', clips: [] }]);
  });

  it('GIVEN a function of another project WHEN placed on a track THEN the update is rejected', async () => {
    const show = await addShow('Foreign');

    const result = await updateShow({
      publicId: show.publicId,
      lightTracks: [
        {
          id: 't1',
          name: 'Front',
          clips: [
            {
              id: 'c1',
              functionPublicId: '6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
              startMs: 0,
              durationMs: 100,
              followBeat: false,
            },
          ],
        },
      ],
    });

    expect(result.errors?.[0]?.extensions?.code).toBe('SHOW_INVALID');
  });

  it('GIVEN two audio clips WHEN moved onto each other THEN the update is rejected, apart it succeeds', async () => {
    const show = await addShow('Moves');
    await uploadWav(show.publicId);
    await uploadWav(show.publicId);
    const listed = await updateShow({ publicId: show.publicId });
    const [first, second] = listed.data?.updateShow.audioClips ?? [];

    const overlapping = await updateShow({
      publicId: show.publicId,
      audioClips: [{ publicId: second?.publicId, startMs: 1000 }],
    });
    const apart = await updateShow({
      publicId: show.publicId,
      audioClips: [
        { publicId: first?.publicId, startMs: 4000 },
        { publicId: second?.publicId, startMs: 0 },
      ],
    });

    expect(overlapping.errors?.[0]?.extensions?.code).toBe('SHOW_INVALID');
    expect(apart.data?.updateShow.audioClips.map(clip => clip.publicId)).toEqual([second?.publicId, first?.publicId]);
  });

  it('GIVEN a show with audio WHEN a clip and then the show are deleted THEN their files are removed', async () => {
    const show = await addShow('Deleted');
    await uploadWav(show.publicId);
    await uploadWav(show.publicId);
    const clips = (await updateShow({ publicId: show.publicId })).data?.updateShow.audioClips ?? [];
    const directory = join(assetsRoot, 'shows', show.publicId);

    const removed = await inject().inject({
      method: 'DELETE',
      url: `/shows/${show.publicId}/audio/${clips[0]?.publicId}`,
    });

    expect(removed.statusCode).toBe(200);
    expect(await readdir(directory)).toEqual([`${clips[1]?.publicId}.pcm`]);
    const deleted = await graphqlQuery<{ deleteShow: { deleted: boolean } }>(
      server(),
      gql`
        mutation ($publicId: UUID!) {
          deleteShow(publicId: $publicId) {
            deleted
          }
        }
      `,
      { variables: { publicId: show.publicId } },
    );
    expect(deleted.data?.deleteShow.deleted).toBe(true);
    expect(existsSync(directory)).toBe(false);
  });

  it('GIVEN a console show control WHEN its show is deleted THEN the control keeps no dangling show', async () => {
    const show = await addShow('Console');
    const consoleWith = (showPublicId: string) => ({
      schemaVersion: 1,
      width: 1280,
      height: 720,
      pages: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Page 1',
          controls: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              type: 'show',
              x: 0,
              y: 0,
              width: 320,
              height: 96,
              label: 'Show',
              backgroundColor: '#000000',
              foregroundColor: '#ffffff',
              showPublicId,
            },
          ],
        },
      ],
    });
    const saveConsole = async (showPublicId: string) =>
      graphqlQuery<{ updateProjectVirtualConsole: { publicId: string } }>(
        server(),
        gql`
          mutation ($input: UpdateProjectVirtualConsoleInput!) {
            updateProjectVirtualConsole(input: $input) {
              publicId
            }
          }
        `,
        { variables: { input: { publicId: projectPublicId, virtualConsole: consoleWith(showPublicId) } } },
      );

    const foreign = await saveConsole('6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d');
    const own = await saveConsole(show.publicId);
    await graphqlQuery(
      server(),
      gql`
        mutation ($publicId: UUID!) {
          deleteShow(publicId: $publicId) {
            deleted
          }
        }
      `,
      { variables: { publicId: show.publicId } },
    );
    const project = await graphqlQuery<{
      project: { virtualConsole: { pages: { controls: { showPublicId: string | null }[] }[] } };
    }>(
      server(),
      gql`
        query ($publicId: UUID!) {
          project(publicId: $publicId) {
            virtualConsole {
              pages {
                controls {
                  showPublicId
                }
              }
            }
          }
        }
      `,
      { variables: { publicId: projectPublicId } },
    );

    expect(foreign.errors?.[0]?.message).toContain('does not belong to this project');
    expect(own.errors).toBeUndefined();
    expect(project.data?.project.virtualConsole.pages[0]?.controls[0]?.showPublicId).toBeNull();
  });

  it('GIVEN a show name in use WHEN another show takes it THEN it answers SHOW_NAME_EXISTS', async () => {
    await addShow('Twice');

    const duplicate = await graphqlQuery(
      server(),
      gql`
        mutation ($input: AddShowInput!) {
          addShow(input: $input) {
            publicId
          }
        }
      `,
      { variables: { input: { projectPublicId, name: 'Twice' } } },
    );

    expect(duplicate.errors?.[0]?.extensions?.code).toBe('SHOW_NAME_EXISTS');
  });
});
