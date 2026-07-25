import type { Plugin } from 'vite';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';

function nestDecoratorCoverageIgnorePlugin(): Plugin {
  return {
    name: 'nest-decorator-coverage-ignore',
    enforce: 'post',
    transform(code: string, id: string) {
      if (id.includes('node_modules') || id.endsWith('.spec.ts') || id.endsWith('.d.ts')) {
        return null;
      }

      let transformed = code;

      // esbuild experimentalDecorators helper runtime (emitted per decorated file)
      transformed = transformed.replace(
        /^var __defProp = Object\.defineProperty;\n(?:var __\w+[^\n]*\n)*var __decorateClass = [\s\S]*?^};\n/m,
        block => `/* v8 ignore start */\n${block}/* v8 ignore stop */\n`,
      );
      transformed = transformed.replace(
        /^var __decorateParam = [^\n]+;\n/m,
        block => `/* v8 ignore start */\n${block}/* v8 ignore stop */\n`,
      );

      // Oxc: _decorate( · esbuild: __decorateClass( · tsc legacy: __decorate(
      // Wrap the full statement so nested _decorateMetadata ternaries are ignored too.
      transformed = transformed.replace(
        /^([ \t]*).*(?:__decorateClass|__decorate|_decorate)\([^;]*\);\s*$/gm,
        match => `/* v8 ignore start */\n${match}\n/* v8 ignore stop */`,
      );

      return transformed !== code ? transformed : null;
    },
  };
}

export default defineConfig({
  plugins: [nestDecoratorCoverageIgnorePlugin()],
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: [['text', { skipFull: false }], 'html', 'json', 'clover'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        'src/**/*.dto.ts',
        // Declaration-only / type-only files with no runtime logic
        '**/src/config/types/**',
        '**/src/events/types/**',
        '**/src/io/dmx/types/**',
        '**/src/io/midi/types/**',
        '**/src/db/schema.ts',
        '**/src/db/drizzle.config.ts',
        '**/src/fixtures/entities/index.ts',
      ],
      thresholds: {
        statements: 80,
        functions: 80,
        lines: 80,
        branches: 80,
      },
    },
  },
});
