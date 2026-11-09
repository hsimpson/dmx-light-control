export type FunctionEvents = {
  'function.deleted': { functionPublicId: string };
  'function.start': { functionPublicId: string; stepped?: boolean };
  /** Plays the next step of a function started with `stepped`; `timing` (ms) replaces that step's own. */
  'function.step': { functionPublicId: string; timing?: { fadeIn: number; hold: number; fadeOut: number } };
  'function.stop': { functionPublicId: string };
  'function.state.request': undefined;
  'function.state': { running: string[] };
};
