import {
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  parseValue,
  type GraphQLFieldConfigArgumentMap,
} from 'graphql';
import { describe, expect, it } from 'vitest';
import { buildVariables } from './graphql-default-variables';

function mutationArgField(args: GraphQLFieldConfigArgumentMap) {
  const mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      example: {
        type: GraphQLString,
        args,
      },
    },
  });
  const field = mutation.getFields().example;
  if (!field) {
    throw new Error('expected example field');
  }
  return field;
}

describe('buildVariables', () => {
  it('coerces list-of-object defaults from GraphQL literals, not AST JSON', () => {
    const dmxValueInput = new GraphQLInputObjectType({
      name: 'DmxValueInput',
      fields: {
        channel: { type: new GraphQLNonNull(GraphQLInt) },
        value: { type: new GraphQLNonNull(GraphQLInt) },
      },
    });
    const channelValuesInput = new GraphQLInputObjectType({
      name: 'ChannelValuesInput',
      fields: {
        dmxValues: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(dmxValueInput))),
          default: { literal: parseValue('[{channel: 1, value: 127}]') },
        },
      },
    });
    const field = mutationArgField({
      channelValues: { type: new GraphQLNonNull(channelValuesInput) },
    });

    expect(JSON.parse(buildVariables(field))).toEqual({
      channelValues: { dmxValues: [{ channel: 1, value: 127 }] },
    });
  });

  it('coerces scalar field defaults from GraphQL literals', () => {
    const openPortsInput = new GraphQLInputObjectType({
      name: 'OpenPortsInput',
      fields: {
        inputPort: { type: new GraphQLNonNull(GraphQLInt), default: { literal: parseValue('1') } },
        outputPort: { type: new GraphQLNonNull(GraphQLInt), default: { literal: parseValue('1') } },
      },
    });
    const field = mutationArgField({
      openPortsDto: { type: new GraphQLNonNull(openPortsInput) },
    });

    expect(JSON.parse(buildVariables(field))).toEqual({
      openPortsDto: { inputPort: 1, outputPort: 1 },
    });
  });

  it('uses runtime default values when provided', () => {
    const input = new GraphQLInputObjectType({
      name: 'PortsInput',
      fields: {
        inputPort: { type: new GraphQLNonNull(GraphQLInt), default: { value: 2 } },
        outputPort: { type: new GraphQLNonNull(GraphQLInt), default: { value: 3 } },
      },
    });
    const field = mutationArgField({
      dto: { type: new GraphQLNonNull(input) },
    });

    expect(JSON.parse(buildVariables(field))).toEqual({
      dto: { inputPort: 2, outputPort: 3 },
    });
  });

  it('returns empty object when the field has no arguments', () => {
    const field = mutationArgField({});
    expect(buildVariables(field)).toBe('{}');
  });
});
