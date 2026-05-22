import { loadSchema } from '@graphql-tools/load';
import { UrlLoader } from '@graphql-tools/url-loader';
import 'dotenv/config';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import {
  isListType,
  isNonNullType,
  isObjectType,
  type GraphQLField,
  type GraphQLObjectType,
  type GraphQLType,
} from 'graphql';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import waitOn from 'wait-on';

const port = process.env.BACKEND_PORT ?? '3000';
const url = `http://localhost:${port}/graphql`;

await waitOn({ resources: [`tcp:localhost:${port}`] });

const schema = await loadSchema(url, {
  loaders: [new UrlLoader()],
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Unwrap NonNull / List wrappers to reach the named type. */
function getNamedType(type: GraphQLType): GraphQLType {
  if (isNonNullType(type) || isListType(type)) {
    return getNamedType((type as { ofType: GraphQLType }).ofType);
  }
  return type;
}

/**
 * Recursively build a selection-set string for an object type.
 * Scalar / enum fields are listed as-is; object fields get nested braces.
 */
function buildSelectionSet(type: GraphQLType, depth = 0, maxDepth = 4): string {
  const namedType = getNamedType(type);
  if (!isObjectType(namedType) || depth >= maxDepth) return '';

  const indent = '  '.repeat(depth + 2);
  const lines: string[] = [];

  for (const field of Object.values(
    (namedType as GraphQLObjectType).getFields(),
  )) {
    const fieldNamedType = getNamedType(field.type);
    if (isObjectType(fieldNamedType)) {
      const nested = buildSelectionSet(field.type, depth + 1, maxDepth);
      if (nested) {
        lines.push(`${indent}${field.name} {`, nested, `${indent}}`);
      } else {
        lines.push(`${indent}${field.name}`);
      }
    } else {
      lines.push(`${indent}${field.name}`);
    }
  }

  return lines.join('\n');
}

/** Build the full operation string (query / mutation) for a root field. */
function buildOperation(
  fieldName: string,
  field: GraphQLField<unknown, unknown>,
  operationType: 'query' | 'mutation',
): string {
  const args = field.args;
  const opArgs = args.length
    ? `(${args.map((a) => `$${a.name}: ${String(a.type)}`).join(', ')})`
    : '';
  const fieldArgs = args.length
    ? `(${args.map((a) => `${a.name}: $${a.name}`).join(', ')})`
    : '';

  const selectionSet = buildSelectionSet(field.type);
  if (selectionSet) {
    return `${operationType}${opArgs} {\n  ${fieldName}${fieldArgs} {\n${selectionSet}\n  }\n}`;
  }
  return `${operationType}${opArgs} {\n  ${fieldName}${fieldArgs}\n}`;
}

/** Build a JSON variables object for all arguments, using defaults or null. */
function buildVariables(field: GraphQLField<unknown, unknown>): string {
  if (!field.args.length) return '{}';
  const vars: Record<string, unknown> = {};
  for (const arg of field.args) {
    vars[arg.name] = arg.defaultValue ?? null;
  }
  return JSON.stringify(vars, null, 2);
}

/** Produce the full Bruno YAML content for a single request. */
function generateBrunoRequest(
  fieldName: string,
  field: GraphQLField<unknown, unknown>,
  operationType: 'query' | 'mutation',
  seq: number,
): string {
  // Indent each line so YAML block-scalar content is properly nested (6 spaces).
  const queryBlock = buildOperation(fieldName, field, operationType)
    .split('\n')
    .join('\n      ');
  const variablesBlock = buildVariables(field).split('\n').join('\n      ');

  return `info:
  name: ${fieldName}
  type: http
  seq: ${seq}

http:
  method: POST
  url: "{{backendUrl}}/graphql"
  auth: inherit
  body: graphql

body:
  graphql:
    query: |
      ${queryBlock}
    variables: |
      ${variablesBlock}

settings:
  encodeUrl: true
  timeout: 0
  followRedirects: true
  maxRedirects: 5
`;
}

/** Write a folder.yml descriptor. */
function writeFolderYml(dir: string, name: string, seq: number): void {
  writeFileSync(
    join(dir, 'folder.yml'),
    `info:\n  name: ${name}\n  type: folder\n  seq: ${seq}\n\nrequest:\n  auth: inherit\n`,
  );
}

// ---------------------------------------------------------------------------
// Collection generation
// ---------------------------------------------------------------------------

const collectionDir = join(
  dirname(fileURLToPath(import.meta.url)),
  'collection',
);

// --- GraphQL parent folder ---
const graphqlDir = join(collectionDir, 'graphql');
rmSync(graphqlDir, { recursive: true, force: true });
mkdirSync(graphqlDir, { recursive: true });
writeFolderYml(graphqlDir, 'graphql', 1);

// --- Queries ---
const queryType = schema.getQueryType();
if (queryType) {
  const queriesDir = join(graphqlDir, 'queries');
  mkdirSync(queriesDir, { recursive: true });
  writeFolderYml(queriesDir, 'queries', 1);

  const fields = Object.values(queryType.getFields());
  fields.forEach((field, i) => {
    writeFileSync(
      join(queriesDir, `${field.name}.yml`),
      generateBrunoRequest(field.name, field, 'query', i + 1),
    );
  });
  console.log(
    `Generated ${fields.length} quer${fields.length === 1 ? 'y' : 'ies'}`,
  );
}

// --- Mutations ---
const mutationType = schema.getMutationType();
if (mutationType) {
  const mutationsDir = join(graphqlDir, 'mutations');
  mkdirSync(mutationsDir, { recursive: true });
  writeFolderYml(mutationsDir, 'mutations', 2);

  const fields = Object.values(mutationType.getFields());
  fields.forEach((field, i) => {
    writeFileSync(
      join(mutationsDir, `${field.name}.yml`),
      generateBrunoRequest(field.name, field, 'mutation', i + 1),
    );
  });
  console.log(
    `Generated ${fields.length} mutation${fields.length === 1 ? '' : 's'}`,
  );
}

console.log('Done - Bruno collection written to', collectionDir);
