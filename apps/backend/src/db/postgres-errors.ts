const UNIQUE_VIOLATION = '23505';

function errorCode(error: unknown): unknown {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return error.code;
}

/** Drizzle wraps the pg error, so the code is either on the error or on its `cause`. */
export function isPostgresUniqueViolation(error: unknown): boolean {
  if (errorCode(error) === UNIQUE_VIOLATION) {
    return true;
  }
  if (typeof error !== 'object' || error === null || !('cause' in error)) {
    return false;
  }
  return errorCode(error.cause) === UNIQUE_VIOLATION;
}
