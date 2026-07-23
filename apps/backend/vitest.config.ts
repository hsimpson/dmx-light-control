import { resolve } from 'node:path';
import { mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.base';
import { nestDecoratorCoverageIgnorePlugin } from './nest-decorator-coverage-ignore.plugin';

export default mergeConfig(baseConfig, {
  plugins: [nestDecoratorCoverageIgnorePlugin()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    globalSetup: [resolve(import.meta.dirname, 'vitest.setup.ts')],
    root: import.meta.dirname,
    coverage: {
      reportsDirectory: '../../coverage/apps/backend',
    },
  },
});
