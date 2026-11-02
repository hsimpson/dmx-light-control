import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadJsonFile } from './download-json-file';

async function downloadBlobText(filename: string, data: unknown): Promise<string> {
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

  downloadJsonFile(filename, data);

  expect(createObjectURL).toHaveBeenCalledOnce();
  const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
  expect(blob).toBeInstanceOf(Blob);
  expect(click).toHaveBeenCalledOnce();
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:fixtures');
  return blob.text();
}

describe('downloadJsonFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads pretty-printed JSON without GraphQL __typename fields', async () => {
    const text = await downloadBlobText('fixtures.json', {
      schemaVersion: 1,
      __typename: 'FixtureExportDocumentDto',
      fixtures: [],
    });

    expect(text).not.toContain('__typename');
    expect(text).not.toContain('FixtureExportDocumentDto');
  });

  it('writes object keys in alphabetical order, including nested objects', async () => {
    const text = await downloadBlobText('fixtures.json', {
      schemaVersion: 1,
      fixtures: [
        {
          name: 'PAR',
          manufacturer: 'ADJ',
          channelModes: [{ name: '3ch', channelCount: 3, channelAssignments: [{ type: 'RED', channel: 1 }] }],
        },
      ],
    });

    expect(text).toBe(
      [
        '{',
        '  "fixtures": [',
        '    {',
        '      "channelModes": [',
        '        {',
        '          "channelAssignments": [',
        '            {',
        '              "channel": 1,',
        '              "type": "RED"',
        '            }',
        '          ],',
        '          "channelCount": 3,',
        '          "name": "3ch"',
        '        }',
        '      ],',
        '      "manufacturer": "ADJ",',
        '      "name": "PAR"',
        '    }',
        '  ],',
        '  "schemaVersion": 1',
        '}',
      ].join('\n'),
    );
  });

  it('preserves array element order including number arrays', async () => {
    const text = await downloadBlobText('projects.json', {
      transform: [9, 1, 8, 2],
      items: [
        { z: 1, a: 0 },
        { z: 2, a: 1 },
      ],
    });
    const parsed = JSON.parse(text) as { transform: number[]; items: { a: number; z: number }[] };

    expect(Object.keys(parsed)).toEqual(['items', 'transform']);
    expect(parsed.transform).toEqual([9, 1, 8, 2]);
    expect(parsed.items.map(item => item.z)).toEqual([1, 2]);
    expect(Object.keys(parsed.items[0] ?? {})).toEqual(['a', 'z']);
  });
});
