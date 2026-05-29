import type { CodegenConfig } from '@graphql-codegen/cli';
import 'dotenv/config';

const graphqlApiUrl = process.env.NEXT_PUBLIC_GRAPHQL_API_URL;
if (!graphqlApiUrl) {
  throw new Error(
    'NEXT_PUBLIC_GRAPHQL_API_URL is not defined in the environment variables',
  );
}

const config: CodegenConfig = {
  verbose: true,
  schema: graphqlApiUrl,
  documents: ['src/**/*.graphql'],
  generates: {
    './src/shared/types/graphql/': {
      preset: 'client',
      plugins: [],
      presetConfig: {
        gqlTagName: 'gql',
      },
      config: {
        scalars: {
          Date: 'string',
          DateTime: 'string',
        },
        skipTypename: true,
      },
    },
  },
  // ignoreNoDocuments: true, // indicates missing graphql statements
};

export default config;
