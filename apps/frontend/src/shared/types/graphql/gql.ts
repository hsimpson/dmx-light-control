/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "fragment FixtureChannelAssignmentFields on FixtureChannelAssignmentDto {\n  publicId\n  channelNumber\n  createdAt\n  updatedAt\n}\n\nfragment FixtureChannelRangeFields on FixtureChannelRangeDto {\n  publicId\n  dmxStart\n  dmxEnd\n  description\n  createdAt\n  updatedAt\n}\n\nfragment FixtureChannelDefinitionFields on FixtureChannelDefinitionDto {\n  publicId\n  name\n  order\n  preset\n  fixtureChannelRanges {\n    ...FixtureChannelRangeFields\n  }\n  createdAt\n  updatedAt\n}\n\nfragment FixtureChannelModeFields on FixtureChannelModeDto {\n  publicId\n  name\n  order\n  fixtureChannelAssignments {\n    ...FixtureChannelAssignmentFields\n  }\n  createdAt\n  updatedAt\n}\n\nfragment FixtureFields on FixtureDto {\n  publicId\n  name\n  fixtureChannelDefinitions {\n    ...FixtureChannelDefinitionFields\n  }\n  fixtureChannelModes {\n    ...FixtureChannelModeFields\n  }\n  fixtureVendor {\n    ...VendorFields\n  }\n  createdAt\n  updatedAt\n}\n\nquery GetFixtures {\n  fixtures {\n    ...FixtureFields\n  }\n}\n\nquery GetFixture($fixtureId: UUID!) {\n  fixture(fixtureId: $fixtureId) {\n    ...FixtureFields\n  }\n}\n\nmutation UpdateFixture($input: UpdateFixtureInput!) {\n  updateFixture(input: $input) {\n    ...FixtureFields\n  }\n}": typeof types.FixtureChannelAssignmentFieldsFragmentDoc,
    "fragment VendorFields on FixtureVendorDto {\n  publicId\n  name\n  createdAt\n  updatedAt\n}\n\nquery GetFixtureVendors {\n  fixtureVendors {\n    ...VendorFields\n  }\n}": typeof types.VendorFieldsFragmentDoc,
};
const documents: Documents = {
    "fragment FixtureChannelAssignmentFields on FixtureChannelAssignmentDto {\n  publicId\n  channelNumber\n  createdAt\n  updatedAt\n}\n\nfragment FixtureChannelRangeFields on FixtureChannelRangeDto {\n  publicId\n  dmxStart\n  dmxEnd\n  description\n  createdAt\n  updatedAt\n}\n\nfragment FixtureChannelDefinitionFields on FixtureChannelDefinitionDto {\n  publicId\n  name\n  order\n  preset\n  fixtureChannelRanges {\n    ...FixtureChannelRangeFields\n  }\n  createdAt\n  updatedAt\n}\n\nfragment FixtureChannelModeFields on FixtureChannelModeDto {\n  publicId\n  name\n  order\n  fixtureChannelAssignments {\n    ...FixtureChannelAssignmentFields\n  }\n  createdAt\n  updatedAt\n}\n\nfragment FixtureFields on FixtureDto {\n  publicId\n  name\n  fixtureChannelDefinitions {\n    ...FixtureChannelDefinitionFields\n  }\n  fixtureChannelModes {\n    ...FixtureChannelModeFields\n  }\n  fixtureVendor {\n    ...VendorFields\n  }\n  createdAt\n  updatedAt\n}\n\nquery GetFixtures {\n  fixtures {\n    ...FixtureFields\n  }\n}\n\nquery GetFixture($fixtureId: UUID!) {\n  fixture(fixtureId: $fixtureId) {\n    ...FixtureFields\n  }\n}\n\nmutation UpdateFixture($input: UpdateFixtureInput!) {\n  updateFixture(input: $input) {\n    ...FixtureFields\n  }\n}": types.FixtureChannelAssignmentFieldsFragmentDoc,
    "fragment VendorFields on FixtureVendorDto {\n  publicId\n  name\n  createdAt\n  updatedAt\n}\n\nquery GetFixtureVendors {\n  fixtureVendors {\n    ...VendorFields\n  }\n}": types.VendorFieldsFragmentDoc,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "fragment FixtureChannelAssignmentFields on FixtureChannelAssignmentDto {\n  publicId\n  channelNumber\n  createdAt\n  updatedAt\n}\n\nfragment FixtureChannelRangeFields on FixtureChannelRangeDto {\n  publicId\n  dmxStart\n  dmxEnd\n  description\n  createdAt\n  updatedAt\n}\n\nfragment FixtureChannelDefinitionFields on FixtureChannelDefinitionDto {\n  publicId\n  name\n  order\n  preset\n  fixtureChannelRanges {\n    ...FixtureChannelRangeFields\n  }\n  createdAt\n  updatedAt\n}\n\nfragment FixtureChannelModeFields on FixtureChannelModeDto {\n  publicId\n  name\n  order\n  fixtureChannelAssignments {\n    ...FixtureChannelAssignmentFields\n  }\n  createdAt\n  updatedAt\n}\n\nfragment FixtureFields on FixtureDto {\n  publicId\n  name\n  fixtureChannelDefinitions {\n    ...FixtureChannelDefinitionFields\n  }\n  fixtureChannelModes {\n    ...FixtureChannelModeFields\n  }\n  fixtureVendor {\n    ...VendorFields\n  }\n  createdAt\n  updatedAt\n}\n\nquery GetFixtures {\n  fixtures {\n    ...FixtureFields\n  }\n}\n\nquery GetFixture($fixtureId: UUID!) {\n  fixture(fixtureId: $fixtureId) {\n    ...FixtureFields\n  }\n}\n\nmutation UpdateFixture($input: UpdateFixtureInput!) {\n  updateFixture(input: $input) {\n    ...FixtureFields\n  }\n}"): (typeof documents)["fragment FixtureChannelAssignmentFields on FixtureChannelAssignmentDto {\n  publicId\n  channelNumber\n  createdAt\n  updatedAt\n}\n\nfragment FixtureChannelRangeFields on FixtureChannelRangeDto {\n  publicId\n  dmxStart\n  dmxEnd\n  description\n  createdAt\n  updatedAt\n}\n\nfragment FixtureChannelDefinitionFields on FixtureChannelDefinitionDto {\n  publicId\n  name\n  order\n  preset\n  fixtureChannelRanges {\n    ...FixtureChannelRangeFields\n  }\n  createdAt\n  updatedAt\n}\n\nfragment FixtureChannelModeFields on FixtureChannelModeDto {\n  publicId\n  name\n  order\n  fixtureChannelAssignments {\n    ...FixtureChannelAssignmentFields\n  }\n  createdAt\n  updatedAt\n}\n\nfragment FixtureFields on FixtureDto {\n  publicId\n  name\n  fixtureChannelDefinitions {\n    ...FixtureChannelDefinitionFields\n  }\n  fixtureChannelModes {\n    ...FixtureChannelModeFields\n  }\n  fixtureVendor {\n    ...VendorFields\n  }\n  createdAt\n  updatedAt\n}\n\nquery GetFixtures {\n  fixtures {\n    ...FixtureFields\n  }\n}\n\nquery GetFixture($fixtureId: UUID!) {\n  fixture(fixtureId: $fixtureId) {\n    ...FixtureFields\n  }\n}\n\nmutation UpdateFixture($input: UpdateFixtureInput!) {\n  updateFixture(input: $input) {\n    ...FixtureFields\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "fragment VendorFields on FixtureVendorDto {\n  publicId\n  name\n  createdAt\n  updatedAt\n}\n\nquery GetFixtureVendors {\n  fixtureVendors {\n    ...VendorFields\n  }\n}"): (typeof documents)["fragment VendorFields on FixtureVendorDto {\n  publicId\n  name\n  createdAt\n  updatedAt\n}\n\nquery GetFixtureVendors {\n  fixtureVendors {\n    ...VendorFields\n  }\n}"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;