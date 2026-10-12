export type FunctionEvents = {
  'function.deleted': { functionPublicId: string };
  'function.start': { functionPublicId: string };
  'function.stop': { functionPublicId: string };
  'function.state.request': undefined;
  'function.state': { running: string[] };
};
