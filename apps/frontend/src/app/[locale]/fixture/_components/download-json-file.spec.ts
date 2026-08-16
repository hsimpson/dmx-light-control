import { downloadJsonFile } from './download-json-file';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('downloadJsonFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads pretty-printed JSON without GraphQL __typename fields', () => {
    const click = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:fixtures');
    const revokeObjectURL = vi.fn();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(createObjectURL);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeObjectURL);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return { click, href: '', download: '' } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tagName);
    });

    downloadJsonFile('fixtures.json', { schemaVersion: 1, __typename: 'FixtureExportDocumentDto', fixtures: [] });

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fixtures');
  });
});
