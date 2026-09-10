import { mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.base.ts';

export default mergeConfig(baseConfig, {
  test: {
    root: import.meta.dirname,
    include: ['**/*.spec.ts'],
    coverage: {
      reportsDirectory: '../../coverage/tools/bruno',
    },
  },
});
