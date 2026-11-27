export type ShowPlaybackStatus = 'playing' | 'paused' | 'stopped';

export type ShowPlaybackState = {
  showPublicId: string | null;
  status: ShowPlaybackStatus;
  positionMs: number;
  durationMs: number;
};

export type ShowEvents = {
  /** Plays the show from `fromMs`; without it a paused show resumes and any other starts at 0. */
  'show.play': { showPublicId: string; fromMs?: number };
  'show.pause': undefined;
  'show.stop': undefined;
  'show.state': ShowPlaybackState;
  'show.state.request': undefined;
};
