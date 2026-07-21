import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
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
