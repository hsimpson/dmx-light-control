import { describe, expect, it } from 'vitest';
import { isPostgresUniqueViolation } from './postgres-errors';

describe('isPostgresUniqueViolation', () => {
  it('detects the code on the error or on its cause', () => {
    expect(isPostgresUniqueViolation({ code: '23505' })).toBe(true);
    expect(isPostgresUniqueViolation(new Error('wrapped', { cause: { code: '23505' } }))).toBe(true);
  });

  it('rejects other errors', () => {
    expect(isPostgresUniqueViolation({ code: '23503' })).toBe(false);
    expect(isPostgresUniqueViolation(new Error('plain'))).toBe(false);
    expect(isPostgresUniqueViolation(null)).toBe(false);
  });
});
