import { resolve } from 'node:path';
import { mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.base.ts';

export default mergeConfig(baseConfig, {
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    // Shared Testcontainers Postgres and process.env; parallel files race unique rows and native IO.
    fileParallelism: false,
    maxWorkers: 1,
    globalSetup: [resolve(import.meta.dirname, 'vitest.setup.ts')],
    root: import.meta.dirname,
    coverage: {
      reportsDirectory: '../../coverage/apps/backend',
    },
  },
});
