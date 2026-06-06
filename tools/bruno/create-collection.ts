import { loadSchema } from '@graphql-tools/load';
import { UrlLoader } from '@graphql-tools/url-loader';
import 'dotenv/config';
import {
  isInputObjectType,
  isListType,
  isNonNullType,
  isObjectType,
  printSchema,
  type GraphQLField,
  type GraphQLObjectType,
  type GraphQLType,
} from 'graphql';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import waitOn from 'wait-on';

const port = process.env.BACKEND_PORT ?? '3000';
const url = `http://localhost:${port}/graphql`;

console.log(`Checking if backend is reachable at ${url} ...`);
await waitOn({ resources: [`tcp:localhost:${port}`], timeout: 5000 }).catch(() => {
  console.error(`Backend not reachable on port ${port}. Start it first with: nx run backend:serve`);
  process.exit(1);
});

const schema = await loadSchema(url, {
  loaders: [new UrlLoader()],
  sort: true,
});

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.graphql');
rmSync(schemaPath, { force: true });
writeFileSync(schemaPath, printSchema(schema));

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

  for (const field of Object.values((namedType as GraphQLObjectType).getFields())) {
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
  const opArgs = args.length ? `(${args.map(a => `$${a.name}: ${String(a.type)}`).join(', ')})` : '';
  const fieldArgs = args.length ? `(${args.map(a => `${a.name}: $${a.name}`).join(', ')})` : '';

  const selectionSet = buildSelectionSet(field.type);
  if (selectionSet) {
    return `${operationType}${opArgs} {\n  ${fieldName}${fieldArgs} {\n${selectionSet}\n  }\n}`;
  }
  return `${operationType}${opArgs} {\n  ${fieldName}${fieldArgs}\n}`;
}

/**
 * Recursively build a default value for an input type by collecting the
 * default values declared on each of its fields.
 */
function buildDefaultValue(type: GraphQLType): unknown {
  if (isNonNullType(type)) {
    return buildDefaultValue((type as { ofType: GraphQLType }).ofType);
  }
  if (isListType(type)) return [];
  if (!isInputObjectType(type)) return null;

  const obj: Record<string, unknown> = {};
  for (const field of Object.values(type.getFields())) {
    obj[field.name] = field.defaultValue !== undefined ? field.defaultValue : buildDefaultValue(field.type);
  }
  return obj;
}

/** Build a JSON variables object for all arguments, using defaults or null. */
function buildVariables(field: GraphQLField<unknown, unknown>): string {
  if (!field.args.length) return '{}';
  const vars: Record<string, unknown> = {};
  for (const arg of field.args) {
    vars[arg.name] = arg.defaultValue !== undefined ? arg.defaultValue : buildDefaultValue(arg.type);
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
  const queryBlock = buildOperation(fieldName, field, operationType).split('\n').join('\n      ');
  const variablesBlock = buildVariables(field).split('\n').join('\n      ');

  return `info:
  name: ${fieldName}
  type: graphql
  seq: ${seq}

graphql:
  method: POST
  url: "{{backendUrl}}/graphql"
  auth: inherit
  body:
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

const collectionDir = join(dirname(fileURLToPath(import.meta.url)), 'collection');

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
    writeFileSync(join(queriesDir, `${field.name}.yml`), generateBrunoRequest(field.name, field, 'query', i + 1));
  });
  console.log(`Generated ${fields.length} quer${fields.length === 1 ? 'y' : 'ies'}`);
}

// --- Mutations ---
const mutationType = schema.getMutationType();
if (mutationType) {
  const mutationsDir = join(graphqlDir, 'mutations');
  mkdirSync(mutationsDir, { recursive: true });
  writeFolderYml(mutationsDir, 'mutations', 2);

  const fields = Object.values(mutationType.getFields());
  fields.forEach((field, i) => {
    writeFileSync(join(mutationsDir, `${field.name}.yml`), generateBrunoRequest(field.name, field, 'mutation', i + 1));
  });
  console.log(`Generated ${fields.length} mutation${fields.length === 1 ? '' : 's'}`);
}

console.log('Done - Bruno collection written to', collectionDir);
