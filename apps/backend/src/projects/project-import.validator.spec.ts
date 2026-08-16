import { describe, expect, it } from 'vitest';
import { assertImportDocument } from './project-import.validator';
import { ProjectImportInvalidException } from './project.exceptions';

describe('assertImportDocument', () => {
  it('accepts schemaVersion 1', () => {
    expect(() => {
      assertImportDocument({ schemaVersion: 1 });
    }).not.toThrow();
  });

  it('rejects an unsupported schemaVersion', () => {
    expect(() => {
      assertImportDocument({ schemaVersion: 2 });
    }).toThrow(ProjectImportInvalidException);
  });
});
