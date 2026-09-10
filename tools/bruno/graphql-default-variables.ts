import {
  coerceInputLiteral,
  isInputObjectType,
  isListType,
  isNonNullType,
  type GraphQLArgument,
  type GraphQLDefaultInput,
  type GraphQLField,
  type GraphQLInputField,
  type GraphQLInputType,
  type GraphQLType,
} from 'graphql';

function jsFromGraphqlDefault(defaultInput: GraphQLDefaultInput | undefined, type: GraphQLInputType): unknown {
  if (!defaultInput) {
    return undefined;
  }
  if (defaultInput.literal) {
    return coerceInputLiteral(defaultInput.literal, type);
  }
  return defaultInput.value;
}

function resolvedDefault(field: GraphQLInputField | GraphQLArgument): unknown {
  return jsFromGraphqlDefault(field.default, field.type);
}

/**
 * Recursively build a default value for an input type by collecting the
 * default values declared on each of its fields.
 */
export function buildDefaultValue(type: GraphQLType): unknown {
  if (isNonNullType(type)) {
    return buildDefaultValue(type.ofType);
  }
  if (isListType(type)) {
    return [];
  }
  if (!isInputObjectType(type)) {
    return null;
  }

  const obj: Record<string, unknown> = {};
  for (const field of Object.values(type.getFields())) {
    obj[field.name] = resolvedDefault(field) ?? buildDefaultValue(field.type);
  }
  return obj;
}

/** Build a JSON variables object for all arguments, using defaults or null. */
export function buildVariables(field: GraphQLField<unknown, unknown>): string {
  if (!field.args.length) {
    return '{}';
  }
  const vars: Record<string, unknown> = {};
  for (const arg of field.args) {
    vars[arg.name] = resolvedDefault(arg) ?? buildDefaultValue(arg.type);
  }
  return JSON.stringify(vars, null, 2);
}
