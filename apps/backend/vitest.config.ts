import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.base';

function nestDecoratorCoverageIgnorePlugin(): Plugin {
  return {
    name: 'nest-decorator-coverage-ignore',
    enforce: 'post',
    transform(code: string, id: string) {
      if (id.includes('node_modules') || id.endsWith('.spec.ts') || id.endsWith('.d.ts') || id.endsWith('.ts')) {
        return null;
      }

      const transformed = code.replace(/^([ \t]*)((?:[\w$]+\s*=\s*){0,2}_decorate\()/gm, '$1/* v8 ignore next */ $2');
      return transformed !== code ? transformed : null;
    },
  };
}

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
