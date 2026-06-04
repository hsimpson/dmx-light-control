import type { CodegenConfig } from '@graphql-codegen/cli';
import 'dotenv/config';

const graphqlApiUrl = process.env.NEXT_PUBLIC_GRAPHQL_API_URL;
if (!graphqlApiUrl) {
  throw new Error('NEXT_PUBLIC_GRAPHQL_API_URL is not defined in the environment variables');
}

const config: CodegenConfig = {
  verbose: true,
  schema: graphqlApiUrl,
  documents: ['src/**/*.graphql'],
  ignoreNoDocuments: true, // for better experience with the watcher
  generates: {
    './src/shared/types/graphql/': {
      preset: 'client',
      presetConfig: {
        gqlTagName: 'gql',
        fragmentMasking: false,
      },
      config: {
        enumType: 'native-const',
        scalars: {
          Date: 'Date',
          DateTime: 'Date',
          UUID: 'string',
        },
        skipTypename: true,
      },
    },
  },
};

export default config;
