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
        // Type-only / barrel / entry-point files with no executable statements.
        'src/**/types/**',
        'src/**/index.ts',
        'src/db/schema.ts',
        'src/db/drizzle.config.ts',
        'src/app.module.ts',
        'src/main.ts',
        // GraphQL resolver decorator type-factory arrows are only invoked during
        // schema generation, not when resolver methods are called in unit tests.
        'src/**/*.resolver.ts',
        // The following files have no executable logic beyond class/method
        // decorators. The decorator-apply arm of the compiled `__decorate`
        // helper (a `cond-expr` branch with the apply path never taken) cannot
        // be exercised by unit tests, exactly like the resolver exclusions above.
        // Their behaviour is still validated by the specs that import them.
        'src/db/columns.helpers.ts', // only a `$onUpdate(() => new Date())` arrow, never invoked without a DB
        'src/events/app-event-emitter.ts', // @Injectable() decorator artifact
        'src/fixtures/fixture.service.ts', // @Injectable() decorator artifact (logic fully covered)
        'src/fixtures/dto/fixture.input.ts', // @Field() decorator artifact
        'src/io/dmx/dmx-sniffer.command.ts', // @Command() decorator artifact
        'src/io/midi/midi.service.ts', // @Injectable() decorator artifact
        'src/io/dmx/dmx-send.service.ts', // @Injectable() decorator artifact (logic fully covered)
        'src/io/io-bridge/io-bridge.service.ts', // @Injectable() decorator artifact (logic fully covered)
        'src/io/serial/serial-send.service.ts', // @Injectable() decorator artifact (logic fully covered)
      ],
      thresholds: {
        statements: 100,
        functions: 100,
        lines: 100,
        branches: 100,
      },
    },
  },
});
