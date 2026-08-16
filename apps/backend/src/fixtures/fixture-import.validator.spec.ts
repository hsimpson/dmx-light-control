import { describe, expect, it } from 'vitest';
import { assertImportDocument } from './fixture-import.validator';
import { FixtureImportInvalidException } from './fixture.exceptions';

const validDocument = {
  schemaVersion: 1,
  fixtures: [
    {
      name: 'Spot',
      vendor: { name: 'Acme' },
      channelDefinitions: [{ publicId: 'def-1', name: 'Dimmer' }],
      channelModes: [
        {
          name: '1ch',
          assignments: [{ channelNumber: 1, channelDefinitionPublicId: 'def-1' }],
        },
      ],
    },
  ],
};

describe('assertImportDocument', () => {
  it('accepts a schemaVersion 1 document with resolvable assignment refs', () => {
    expect(() => {
      assertImportDocument(validDocument);
    }).not.toThrow();
  });

  it('rejects an unknown schemaVersion', () => {
    expect(() => {
      assertImportDocument({ ...validDocument, schemaVersion: 2 });
    }).toThrow(FixtureImportInvalidException);
  });

  it('rejects assignments that do not match a definition in the same fixture', () => {
    expect(() => {
      assertImportDocument({
        schemaVersion: 1,
        fixtures: [
          {
            name: 'Spot',
            vendor: { name: 'Acme' },
            channelDefinitions: [{ name: 'Dimmer' }],
            channelModes: [
              {
                name: '1ch',
                assignments: [{ channelNumber: 1, channelDefinitionPublicId: 'missing' }],
              },
            ],
          },
        ],
      });
    }).toThrow(FixtureImportInvalidException);
  });

  it('resolves assignments by definition name when publicId is omitted', () => {
    expect(() => {
      assertImportDocument({
        schemaVersion: 1,
        fixtures: [
          {
            name: 'Spot',
            vendor: { name: 'Acme' },
            channelDefinitions: [{ name: 'Dimmer' }],
            channelModes: [
              {
                name: '1ch',
                assignments: [{ channelNumber: 1, channelDefinitionName: 'Dimmer' }],
              },
            ],
          },
        ],
      });
    }).not.toThrow();
  });
});
