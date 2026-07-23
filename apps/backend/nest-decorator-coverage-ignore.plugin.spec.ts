import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from 'vite';
import {
  addCompiledDecoratorCoverageIgnores,
  addDecoratorCoverageIgnores,
  COVERAGE_IGNORE_COMMENT,
  nestDecoratorCoverageIgnorePlugin,
} from './nest-decorator-coverage-ignore.plugin';

describe('addDecoratorCoverageIgnores', () => {
  it('inserts a v8 ignore comment before a class decorator', () => {
    const source = `@Injectable()
export class ExampleService {}`;

    expect(addDecoratorCoverageIgnores(source)).toBe(
      `${COVERAGE_IGNORE_COMMENT}
@Injectable()
${COVERAGE_IGNORE_COMMENT}
export class ExampleService {}`,
    );
  });

  it('inserts ignore comments before method and parameter decorators', () => {
    const source = `export class ExampleResolver {
  @Query(() => String)
  public getValue(@Args('id') id: string): string {
    return id;
  }
}`;

    const result = addDecoratorCoverageIgnores(source);

    expect(result).toContain(`${COVERAGE_IGNORE_COMMENT}\n  @Query(() => String)`);
    expect(result).toContain(`${COVERAGE_IGNORE_COMMENT}\n  public getValue(@Args('id') id: string)`);
  });

  it('inserts ignore comments before class decorators and the decorated class declaration', () => {
    const source = `@Resolver()
export class ExampleResolver {}`;

    const result = addDecoratorCoverageIgnores(source);

    expect(result).toBe(`${COVERAGE_IGNORE_COMMENT}
@Resolver()
${COVERAGE_IGNORE_COMMENT}
export class ExampleResolver {}`);
  });

  it('leaves source without decorators unchanged', () => {
    const source = `export function add(a: number, b: number): number {
  return a + b;
}`;

    expect(addDecoratorCoverageIgnores(source)).toBe(source);
  });
});

describe('addCompiledDecoratorCoverageIgnores', () => {
  it('inserts ignore comments before compiled decorator helper calls', () => {
    const source = `let DmxResolver = class DmxResolver {
  setChannelValues(dto) {
    return dto;
  }
};
_decorate([
  Mutation(() => String),
  _decorateParam(0, Args("channelValues")),
  _decorateMetadata("design:paramtypes", [typeof ChannelValuesInput === "undefined" ? Object : ChannelValuesInput])
], DmxResolver.prototype, "setChannelValues", null);
DmxResolver = _decorate([Resolver(), _decorateMetadata("design:paramtypes", [typeof AppEventEmitter === "undefined" ? Object : AppEventEmitter])], DmxResolver);`;

    const result = addCompiledDecoratorCoverageIgnores(source);

    expect(result).toContain(`${COVERAGE_IGNORE_COMMENT}\n_decorate([\n  Mutation(() => String),`);
    expect(result).toContain(`${COVERAGE_IGNORE_COMMENT}\n  _decorateParam(0, Args("channelValues"))`);
    expect(result).toContain(`${COVERAGE_IGNORE_COMMENT}\n  _decorateMetadata("design:paramtypes",`);
    expect(result).toContain(`${COVERAGE_IGNORE_COMMENT}\nDmxResolver = _decorate([Resolver(), _decorateMetadata(`);
  });
});

describe('nestDecoratorCoverageIgnorePlugin', () => {
  it('returns a vite plugin that transforms typescript sources before transpilation', () => {
    const plugin = nestDecoratorCoverageIgnorePlugin();

    expect(plugin.name).toBe('nest-decorator-coverage-ignore');
    expect(plugin.enforce).toBe('pre');

    const source = `@Module({})
export class AppModule {}`;
    const transformed = plugin.transform?.(source, '/project/src/app.module.ts');

    expect(transformed).toEqual({
      code: `${COVERAGE_IGNORE_COMMENT}
@Module({})
${COVERAGE_IGNORE_COMMENT}
export class AppModule {}`,
      map: null,
    });
  });

  it('registers a compiled decorator plugin after vite config is resolved', () => {
    const plugin = nestDecoratorCoverageIgnorePlugin();
    const config = { plugins: [] } as ResolvedConfig;

    plugin.configResolved?.(config);

    expect(config.plugins).toHaveLength(1);
    expect(config.plugins[0]?.name).toBe('nest-decorator-coverage-ignore:compiled');

    const source = `DmxResolver = _decorate([Resolver()], DmxResolver);`;
    const transformed = config.plugins[0]?.transform?.(source, '/project/src/dmx.resolver.ts');

    expect(transformed?.code).toContain(`${COVERAGE_IGNORE_COMMENT}\nDmxResolver = _decorate([Resolver()], DmxResolver);`);
  });

  it('skips non-typescript files and declaration files', () => {
    const plugin = nestDecoratorCoverageIgnorePlugin();

    expect(plugin.transform?.('export {}', '/project/src/app.js')).toBeNull();
    expect(plugin.transform?.('export {}', '/project/src/app.d.ts')).toBeNull();
    expect(plugin.transform?.('export {}', '/project/node_modules/pkg/index.ts')).toBeNull();
  });
});
