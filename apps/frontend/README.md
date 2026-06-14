# Frontend project

This project contains the frontend code for the DMX Light Control application. It is built using Next.js and provides a user interface for controlling DMX lights through the backend API.

## Development setup

copy .env.example to .env and fill in the required environment variables

## Commands

Serve the frontend application in development mode:

```bash
nx run frontend:dev
```

Build the frontend application for production:

```bash
nx run frontend:build
```

Start the frontend application in production mode:

```bash
nx run frontend:start
```

To extract translation keys from the source code and update the translation files, run the following command:

```bash
nx run frontend:i18n-extract
```

To verify that translation files are in sync (missing and extra keys), run:

```bash
nx run frontend:i18n-verify
```

To generate TypeScript types for the GraphQL schema, run the following command:

```bash
nx run frontend:graphql-codegen
```
