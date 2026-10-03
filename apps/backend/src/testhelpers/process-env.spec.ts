import { describe, expect, it } from 'vitest';
import { overrideProcessEnv } from './process-env';

describe('overrideProcessEnv', () => {
  it('deletes a key that was unset before the override', () => {
    Reflect.deleteProperty(process.env, 'DMX_TEST_UNSET_KEY');
    const restore = overrideProcessEnv({ DMX_TEST_UNSET_KEY: '1' });
    expect(process.env.DMX_TEST_UNSET_KEY).toBe('1');
    restore();
    expect(process.env.DMX_TEST_UNSET_KEY).toBeUndefined();
  });
});
