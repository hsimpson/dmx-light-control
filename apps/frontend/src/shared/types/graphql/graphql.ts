/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
/** The preset of a fixture channel assignment */
export type FixtureChannelPreset =
  | 'Custom'
  | 'IntensityAmber'
  | 'IntensityBlue'
  | 'IntensityDimmer'
  | 'IntensityGreen'
  | 'IntensityMasterDimmer'
  | 'IntensityRed'
  | 'IntensityUV'
  | 'IntensityWhite'
  | 'ShutterStrobeFastSlow'
  | 'ShutterStrobeSlowFast';

export type GetFixturesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetFixturesQuery = { fixtures: Array<{ externalId: string, name: string, createdAt: string, updatedAt: string, vendor: { externalId: string, name: string, createdAt: string, updatedAt: string }, channelAssignments: Array<{ channelMode: number, channelNumber: number, createdAt: string, externalId: string, preset: FixtureChannelPreset, updatedAt: string }> }> };


export const GetFixturesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetFixtures"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fixtures"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"externalId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"externalId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"channelAssignments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"channelMode"}},{"kind":"Field","name":{"kind":"Name","value":"channelNumber"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"externalId"}},{"kind":"Field","name":{"kind":"Name","value":"preset"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetFixturesQuery, GetFixturesQueryVariables>;