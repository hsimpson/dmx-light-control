import { describe, expect, it } from 'vitest';
import { assertImportDocument } from './project-import.validator';
import { ProjectImportInvalidException } from './project.exceptions';

describe('assertImportDocument', () => {
  it('accepts schemaVersion 1', () => {
    expect(() => {
      assertImportDocument({ schemaVersion: 1 });
    }).not.toThrow();
  });

  it('accepts schemaVersion 2', () => {
    expect(() => {
      assertImportDocument({ schemaVersion: 2 });
    }).not.toThrow();
  });

  it('accepts schemaVersion 3', () => {
    expect(() => {
      assertImportDocument({ schemaVersion: 3 });
    }).not.toThrow();
  });

  it('rejects unsupported schemaVersion', () => {
    expect(() => {
      assertImportDocument({ schemaVersion: 99 });
    }).toThrow(ProjectImportInvalidException);
  });
});
