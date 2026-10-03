import { createDefaultVirtualConsoleDocument } from './virtual-console-document';
import {
  clearVirtualConsoleDraft,
  isVirtualConsoleDraftMessage,
  publishVirtualConsoleDraft,
  readVirtualConsoleDraft,
  virtualConsoleDraftStorageKey,
} from './virtual-console-draft-sync';
import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest';

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

  it('accepts only draft messages that carry a document object', () => {
    const document = createDefaultVirtualConsoleDocument();
    expect(isVirtualConsoleDraftMessage('nope')).toBe(false);
    expect(isVirtualConsoleDraftMessage(null)).toBe(false);
    expect(isVirtualConsoleDraftMessage({ type: 'other', document })).toBe(false);
    expect(isVirtualConsoleDraftMessage({ type: 'draft', document: 'x' })).toBe(false);
    expect(isVirtualConsoleDraftMessage({ type: 'draft', document: null })).toBe(false);
    expect(isVirtualConsoleDraftMessage({ type: 'draft', document })).toBe(true);
  });
});

describe('virtual-console-draft-sync without browser storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('skips storage and broadcast when those APIs are missing', () => {
    vi.stubGlobal('sessionStorage', undefined);
    vi.stubGlobal('BroadcastChannel', undefined);
    const document = createDefaultVirtualConsoleDocument();

    expect(() => publishVirtualConsoleDraft('proj-1', document)).not.toThrow();
    expect(readVirtualConsoleDraft('proj-1')).toBeNull();
    expect(() => clearVirtualConsoleDraft('proj-1')).not.toThrow();
  });
});
