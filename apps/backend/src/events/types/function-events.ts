export type FunctionEvents = {
  'function.deleted': { functionPublicId: string };
  /** `beats` starts a stepped function as if it had already taken that many steps (a show seeking into a clip). */
  'function.start': { functionPublicId: string; stepped?: boolean; beats?: number };
  /** Plays the next step of a function started with `stepped`; `timing` (ms) replaces that step's own. */
  'function.step': { functionPublicId: string; timing?: { fadeIn: number; hold: number; fadeOut: number } };
  /** One tap for every running function; `timing` (ms) replaces the tapped step's own, `gapMs` is the tap tempo. */
  'function.tap': { timing?: { fadeIn: number; hold: number; fadeOut: number }; gapMs?: number };
  /** Global crossfade time (ms) for every step without tempo timing of its own; 0 brings back each step's own. */
  'function.fadeTime': { ms: number };
  'function.stop': { functionPublicId: string };
  'function.state.request': undefined;
  'function.state': { running: string[] };
};
