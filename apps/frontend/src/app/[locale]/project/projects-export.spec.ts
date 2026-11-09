import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildSchema,
  type FieldNode,
  type FragmentDefinitionNode,
  getNamedType,
  type GraphQLInputObjectType,
  isInputObjectType,
  Kind,
  parse,
  type SelectionSetNode,
} from 'graphql';
import { describe, expect, it } from 'vitest';

const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const schema = buildSchema(read('../../../../../../tools/bruno/schema.graphql'));
const document = parse(read('./projects.graphql'));
const fragments = new Map(
  document.definitions
    .filter((definition): definition is FragmentDefinitionNode => definition.kind === Kind.FRAGMENT_DEFINITION)
    .map(fragment => [fragment.name.value, fragment]),
);

const fieldsOf = (selectionSet: SelectionSetNode): FieldNode[] =>
  selectionSet.selections.flatMap(selection => {
    if (selection.kind === Kind.FIELD) {
      return [selection];
    }
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      return fieldsOf(selection.selectionSet);
    }
    const fragment = fragments.get(selection.name.value);
    if (!fragment) {
      throw new Error(`unknown fragment ${selection.name.value}`);
    }
    return fieldsOf(fragment.selectionSet);
  });

/** Exported fields the import input does not accept; the import mutation rejects the whole file for any of them. */
const unknownInputFields = (selectionSet: SelectionSetNode, input: GraphQLInputObjectType, path: string): string[] =>
  fieldsOf(selectionSet).flatMap(field => {
    const name = field.name.value;
    if (name === '__typename') {
      return [];
    }
    const inputField = input.getFields()[name];
    if (!inputField) {
      return [`${path}.${name}`];
    }
    const inputType = getNamedType(inputField.type);
    return field.selectionSet && isInputObjectType(inputType)
      ? unknownInputFields(field.selectionSet, inputType, `${path}.${name}`)
      : [];
  });

describe('ExportProjects query', () => {
  it('GIVEN an exported file WHEN it is imported again THEN ImportProjectsInput accepts every exported field', () => {
    const exportQuery = document.definitions.find(
      definition => definition.kind === Kind.OPERATION_DEFINITION && definition.name?.value === 'ExportProjects',
    );
    const importInput = schema.getType('ImportProjectsInput');
    const root = exportQuery?.kind === Kind.OPERATION_DEFINITION ? fieldsOf(exportQuery.selectionSet)[0] : undefined;
    if (!root?.selectionSet || !isInputObjectType(importInput)) {
      throw new Error('ExportProjects query or ImportProjectsInput not found');
    }

    expect(unknownInputFields(root.selectionSet, importInput, 'document')).toEqual([]);
  });
});
