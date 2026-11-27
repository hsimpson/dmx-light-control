import { AppEventEmitter } from '@/events/app-event-emitter';
import { AudioOutputService, type AudioOutputSource } from '@/io/audio-output/audio-output.service';
import type { ShowPlaybackState } from '@/io/show-playback/show-events';
import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { kickTrackWav } from '@/testhelpers/wav';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import gql from 'graphql-tag';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type Emitted = { event: string; functionPublicId?: string; stepped?: boolean; beats?: number };

/** Stands in for the sound card: the test pulls buffers the way the device would. */
type FakeOutput = Pick<AudioOutputService, 'openHandle' | 'setSource' | 'listOutputs' | 'sync' | 'onModuleDestroy'> & {
  handle: string | null;
  source: AudioOutputSource | null;
};

const output: FakeOutput = {
  handle: null,
  source: null,
  openHandle(): string | null {
    return this.handle;
  },
  setSource(source: AudioOutputSource | null): void {
    this.source = source;
  },
  listOutputs: () => [],
  sync: () => undefined,
  onModuleDestroy: () => undefined,
};

describe('Show playback', () => {
  let app: NestFastifyApplication;
  let assetsRoot: string;
  let events: AppEventEmitter;
  let projectPublicId: string;
  let emitted: Emitted[];
  let states: ShowPlaybackState[];

  const server = () => app.getHttpAdapter().getInstance().server;

  async function mutate<T>(query: ReturnType<typeof gql>, variables: Record<string, unknown>): Promise<T> {
    const result = await graphqlQuery<T>(server(), query, { variables });
    expect(result.errors).toBeUndefined();
    if (!result.data) throw new Error('no data');
    return result.data;
  }

  async function addFunction(name: string): Promise<string> {
    const data = await mutate<{ addProjectFunction: { publicId: string } }>(
      gql`
        mutation ($input: AddProjectFunctionInput!) {
          addProjectFunction(input: $input) {
            publicId
          }
        }
      `,
      {
        input: {
          projectPublicId,
          name,
          type: 'Sequence',
          sequence: {
            direction: 'Forward',
            runOrder: 'Loop',
            steps: [
              { fadeIn: 0, hold: 100, fadeOut: 0, dmxValues: [{ channel: 7, value: 100 }] },
              { fadeIn: 0, hold: 100, fadeOut: 0, dmxValues: [{ channel: 7, value: 200 }] },
            ],
          },
        },
      },
    );
    return data.addProjectFunction.publicId;
  }

  /** A show with a 3 s kick track (beats at 0, 500, … 2500 ms) and one clip per given function. */
  async function addShow(clips: { functionPublicId: string; startMs: number; durationMs: number }[]) {
    const created = await mutate<{ addShow: { publicId: string } }>(
      gql`
        mutation ($input: AddShowInput!) {
          addShow(input: $input) {
            publicId
          }
        }
      `,
      { input: { projectPublicId, name: `Show ${Date.now()} ${Math.random()}` } },
    );
    const showPublicId = created.addShow.publicId;
    const boundary = '----showPlaybackBoundary';
    const upload = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: `/shows/${showPublicId}/audio`,
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
        payload: Buffer.concat([
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="kicks.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
          ),
          kickTrackWav(48000, 3000, 500, 0),
          Buffer.from(`\r\n--${boundary}--\r\n`),
        ]),
      });
    expect(upload.statusCode).toBe(201);
    const updated = await mutate<{ updateShow: { beatsMs: number[] } }>(
      gql`
        mutation ($input: UpdateShowInput!) {
          updateShow(input: $input) {
            beatsMs
          }
        }
      `,
      {
        input: {
          publicId: showPublicId,
          lightTracks: [
            {
              id: 't1',
              name: 'Front',
              clips: clips.map((clip, index) => ({ id: `c${index}`, followBeat: true, ...clip })),
            },
          ],
        },
      },
    );
    return { showPublicId, beatsMs: updated.updateShow.beatsMs };
  }

  // Real time, not faked: playback and function playback load from the database in between.
  const settle = async () => new Promise(resolve => setTimeout(resolve, 5));

  /** Advances show time tick by tick. */
  async function run(ms: number): Promise<void> {
    for (let elapsed = 0; elapsed < ms; elapsed += 25) {
      vi.advanceTimersByTime(25);
      await settle();
    }
  }

  async function play(showPublicId: string, fromMs?: number): Promise<void> {
    const before = states.length;
    events.emit('show.play', { showPublicId, fromMs });
    while (!states.slice(before).some(state => state.status === 'playing')) await settle();
  }

  const beatsUpTo = (beatsMs: number[], ms: number) => beatsMs.filter(beat => beat <= ms).length;

  const ofKind = (event: string) => emitted.filter(entry => entry.event === event);

  beforeAll(async () => {
    assetsRoot = await mkdtemp(join(tmpdir(), 'show-playback-e2e-'));
    process.env.FIXTURE_ASSETS_ROOT = assetsRoot;
    app = await createE2eApp(builder => builder.overrideProvider(AudioOutputService).useValue(output));
    events = app.get(AppEventEmitter);
    for (const event of ['function.start', 'function.step', 'function.stop'] as const) {
      events.on(event, payload => {
        emitted.push({ event, ...payload });
      });
    }
    events.on('show.state', state => {
      states.push(state);
    });
    const created = await mutate<{ createProject: { publicId: string } }>(
      gql`
        mutation ($input: CreateProjectInput!) {
          createProject(input: $input) {
            publicId
          }
        }
      `,
      { input: { name: `Show playback ${Date.now()}` } },
    );
    projectPublicId = created.createProject.publicId;
  });

  beforeEach(() => {
    emitted = [];
    states = [];
    output.handle = null;
    output.source = null;
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    events.emit('show.stop');
    vi.useRealTimers();
  });

  afterAll(async () => {
    await app.close();
    await rm(assetsRoot, { recursive: true, force: true });
    delete process.env.FIXTURE_ASSETS_ROOT;
  });

  it('GIVEN a follow-beat clip WHEN the show plays without audio output THEN it starts stepped and steps per beat', async () => {
    const chase = await addFunction(`Chase ${Date.now()}`);
    const { showPublicId: show, beatsMs } = await addShow([{ functionPublicId: chase, startMs: 0, durationMs: 3000 }]);

    await play(show);
    await run(1100);

    expect(ofKind('function.start').map(({ functionPublicId, stepped }) => [functionPublicId, stepped])).toEqual([
      [chase, true],
    ]);
    const startBeats = ofKind('function.start')[0]?.beats ?? 0;
    // Kicks every 500 ms: whatever the start did not count, steps deliver.
    expect(beatsMs.length).toBeGreaterThanOrEqual(4);
    expect(startBeats + ofKind('function.step').length).toBe(beatsUpTo(beatsMs, 1100));
    expect(states.at(-1)).toMatchObject({ showPublicId: show, status: 'playing', durationMs: 3000 });
  });

  it('GIVEN a playing show WHEN paused and resumed THEN its functions stop and restart on the beat they reached', async () => {
    const chase = await addFunction(`Pause ${Date.now()}`);
    const { showPublicId: show, beatsMs } = await addShow([{ functionPublicId: chase, startMs: 0, durationMs: 3000 }]);
    await play(show);
    await run(1300);

    events.emit('show.pause');
    const paused = states.at(-1);
    await run(500);
    await play(show);

    expect(paused).toMatchObject({ status: 'paused' });
    expect(paused?.positionMs).toBeGreaterThanOrEqual(1250);
    expect(ofKind('function.stop').map(entry => entry.functionPublicId)).toEqual([chase]);
    expect(ofKind('function.start').at(-1)).toMatchObject({
      functionPublicId: chase,
      beats: beatsUpTo(beatsMs, paused?.positionMs ?? 0),
    });
  });

  it('GIVEN back-to-back clips of a function WHEN the show plays to the end THEN it restarts once and the show stops', async () => {
    const chase = await addFunction(`Back ${Date.now()}`);
    const { showPublicId: show } = await addShow([
      { functionPublicId: chase, startMs: 0, durationMs: 1000 },
      { functionPublicId: chase, startMs: 1000, durationMs: 1000 },
    ]);

    await play(show);
    await run(3100);

    expect(ofKind('function.start')).toHaveLength(2);
    expect(ofKind('function.stop')).toHaveLength(2);
    expect(states.at(-1)).toMatchObject({ showPublicId: null, status: 'stopped' });
  });

  it('GIVEN a show still loading WHEN stop arrives THEN it never starts', async () => {
    const chase = await addFunction(`Race ${Date.now()}`);
    const { showPublicId: show } = await addShow([{ functionPublicId: chase, startMs: 0, durationMs: 3000 }]);

    events.emit('show.play', { showPublicId: show });
    events.emit('show.stop');
    await run(500);

    expect(states.some(state => state.status === 'playing')).toBe(false);
    expect(ofKind('function.start')).toEqual([]);
  });

  it('GIVEN a function the console already runs WHEN a show clip covers it THEN the show leaves it alone', async () => {
    const chase = await addFunction(`Console ${Date.now()}`);
    const { showPublicId: show } = await addShow([{ functionPublicId: chase, startMs: 0, durationMs: 500 }]);
    events.emit('function.start', { functionPublicId: chase });
    await run(25);
    emitted = [];

    await play(show);
    await run(1000);

    expect(emitted).toEqual([]);
    events.emit('function.stop', { functionPublicId: chase });
  });

  it('GIVEN an audio output WHEN the device pulls buffers THEN it gets the show audio and the clock follows it', async () => {
    const { showPublicId: show } = await addShow([]);
    output.handle = 'Speakers';

    await play(show);
    const buffers = Array.from({ length: 12 }, () => output.source?.());
    await run(25);

    expect(buffers.every(buffer => buffer?.length === 4096)).toBe(true);
    expect(buffers.some(buffer => buffer?.some(byte => byte !== 0))).toBe(true);
    // 12 pulled, 2 still queued: 10 buffers of 1024 frames played.
    expect(states.at(-1)?.positionMs).toBeGreaterThanOrEqual(Math.floor((10 * 1024 * 1000) / 48000));

    events.emit('show.stop');
    expect(output.source).toBeNull();
  });
});
