import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.base';

export default mergeConfig(baseConfig, {
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    root: import.meta.dirname,
    coverage: {
      reportsDirectory: '../../coverage/apps/backend',
    },
  },
});
