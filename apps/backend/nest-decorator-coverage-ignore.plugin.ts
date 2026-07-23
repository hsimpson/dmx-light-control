import ts from 'typescript';
import type { Plugin, ResolvedConfig } from 'vite';

export const COVERAGE_IGNORE_COMMENT = '/* v8 ignore next -- @preserve */';

const COMPILED_DECORATOR_CALL_PATTERN = /^(\s*)((?:\w+\s*=\s*)?_decorate(?:Param|Metadata)?)\(/gm;

function getLineStart(sourceFile: ts.SourceFile, position: number): number {
  const { line } = sourceFile.getLineAndCharacterOfPosition(position);
  return ts.getPositionOfLineAndCharacter(sourceFile, line, 0);
}

function getDeclarationLineStart(sourceFile: ts.SourceFile, node: ts.Node): number {
  if (!ts.canHaveDecorators(node)) {
    return getLineStart(sourceFile, node.getStart(sourceFile));
  }

  const decorators = ts.getDecorators(node);
  if (!decorators?.length) {
    return getLineStart(sourceFile, node.getStart(sourceFile));
  }

  let position = decorators[decorators.length - 1].end;
  while (position < node.end) {
    const character = sourceFile.text[position];
    if (character === undefined || !/\s/.test(character)) {
      break;
    }

    position += 1;
  }

  return getLineStart(sourceFile, position);
}

export function addDecoratorCoverageIgnores(source: string): string {
  const sourceFile = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const ignoredLineStarts = new Set<number>();

  const addLineStart = (position: number): void => {
    ignoredLineStarts.add(getLineStart(sourceFile, position));
  };

  const collectDecorators = (node: ts.Node): void => {
    if (ts.canHaveDecorators(node)) {
      const decorators = ts.getDecorators(node);
      if (decorators?.length) {
        for (const decorator of decorators) {
          addLineStart(decorator.getStart(sourceFile));
        }

        ignoredLineStarts.add(getDeclarationLineStart(sourceFile, node));
      }
    }

    ts.forEachChild(node, collectDecorators);
  };

  collectDecorators(sourceFile);

  if (ignoredLineStarts.size === 0) {
    return source;
  }

  const sortedLineStarts = [...ignoredLineStarts].sort((left, right) => right - left);
  let transformed = source;

  for (const lineStart of sortedLineStarts) {
    transformed = `${transformed.slice(0, lineStart)}${COVERAGE_IGNORE_COMMENT}\n${transformed.slice(lineStart)}`;
  }

  return transformed;
}

export function addCompiledDecoratorCoverageIgnores(code: string): string {
  return code.replace(
    COMPILED_DECORATOR_CALL_PATTERN,
    (_match, indentation: string, decoratorCall: string) =>
      `${indentation}${COVERAGE_IGNORE_COMMENT}\n${indentation}${decoratorCall}(`,
  );
}

function shouldTransformTypeScriptFile(id: string): boolean {
  return id.endsWith('.ts') && !id.endsWith('.d.ts') && !id.includes('node_modules');
}

function hasCompiledDecoratorCalls(code: string): boolean {
  return /_decorate(?:Param|Metadata)?\s*\(/.test(code);
}

function createCompiledDecoratorPlugin(): Plugin {
  return {
    name: 'nest-decorator-coverage-ignore:compiled',
    transform(code, id) {
      if (!shouldTransformTypeScriptFile(id) || !hasCompiledDecoratorCalls(code)) {
        return null;
      }

      const transformed = addCompiledDecoratorCoverageIgnores(code);
      if (transformed === code) {
        return null;
      }

      return {
        code: transformed,
      };
    },
  };
}

function registerCompiledDecoratorPlugin(config: ResolvedConfig): void {
  const alreadyRegistered = config.plugins.some(plugin => plugin.name === 'nest-decorator-coverage-ignore:compiled');
  if (alreadyRegistered) {
    return;
  }

  config.plugins.push(createCompiledDecoratorPlugin());
}

export function nestDecoratorCoverageIgnorePlugin(): Plugin {
  return {
    name: 'nest-decorator-coverage-ignore',
    enforce: 'pre',
    configResolved(config) {
      registerCompiledDecoratorPlugin(config);
    },
    transform(code, id) {
      if (!shouldTransformTypeScriptFile(id)) {
        return null;
      }

      const transformed = addDecoratorCoverageIgnores(code);
      if (transformed === code) {
        return null;
      }

      return {
        code: transformed,
        map: null,
      };
    },
  };
}
