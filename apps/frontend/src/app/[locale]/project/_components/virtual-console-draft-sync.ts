import type { VirtualConsoleDocument } from './virtual-console-document';

export const virtualConsoleDraftStorageKey = (projectPublicId: string) =>
  `dmx-virtual-console-draft:${projectPublicId}`;

export const virtualConsoleDraftChannel = (projectPublicId: string) => `dmx-virtual-console-draft:${projectPublicId}`;

export type VirtualConsoleDraftMessage = {
  type: 'draft';
  document: VirtualConsoleDocument;
};

export const publishVirtualConsoleDraft = (projectPublicId: string, document: VirtualConsoleDocument): void => {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(virtualConsoleDraftStorageKey(projectPublicId), JSON.stringify(document));
  }
  if (typeof BroadcastChannel === 'undefined') {
    return;
  }
  const channel = new BroadcastChannel(virtualConsoleDraftChannel(projectPublicId));
  channel.postMessage({ type: 'draft', document } satisfies VirtualConsoleDraftMessage);
  channel.close();
};

export const readVirtualConsoleDraft = (projectPublicId: string): VirtualConsoleDocument | null => {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(virtualConsoleDraftStorageKey(projectPublicId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as VirtualConsoleDocument;
  } catch {
    return null;
  }
};

export const clearVirtualConsoleDraft = (projectPublicId: string): void => {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(virtualConsoleDraftStorageKey(projectPublicId));
  }
};

export const isVirtualConsoleDraftMessage = (value: unknown): value is VirtualConsoleDraftMessage => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { type?: unknown; document?: unknown };
  return candidate.type === 'draft' && typeof candidate.document === 'object' && candidate.document !== null;
};
