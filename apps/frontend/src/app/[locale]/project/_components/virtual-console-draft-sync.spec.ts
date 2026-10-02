import { createDefaultVirtualConsoleDocument } from './virtual-console-document';
import {
  clearVirtualConsoleDraft,
  publishVirtualConsoleDraft,
  readVirtualConsoleDraft,
  virtualConsoleDraftStorageKey,
} from './virtual-console-draft-sync';
import { describe, expect, it, beforeEach } from 'vitest';

describe('virtual-console-draft-sync', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores and reads a draft document', () => {
    const document = createDefaultVirtualConsoleDocument();
    publishVirtualConsoleDraft('proj-1', document);
    expect(readVirtualConsoleDraft('proj-1')).toEqual(document);
    expect(sessionStorage.getItem(virtualConsoleDraftStorageKey('proj-1'))).toBeTruthy();
  });

  it('clears stored draft', () => {
    publishVirtualConsoleDraft('proj-1', createDefaultVirtualConsoleDocument());
    clearVirtualConsoleDraft('proj-1');
    expect(readVirtualConsoleDraft('proj-1')).toBeNull();
  });
});
