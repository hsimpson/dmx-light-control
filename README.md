# dmx-light-control

## Development setup

- Install Docker and Docker Compose for running the local database. It does'nt matter which docker engine you use, as long as it supports `docker´ and `docker compose`.
- Install Node.js (version 24 or higher).
- Install pnpm package manager
- Install Nx globally:

```bash
npm install -g nx
```

- Install project dependencies:

```bash
pnpm install
```

- copy .env.example to .env and fill in the required environment variables

## Nx monorepo

The dmx-light-control project is a monorepo managed with Nx, which contains multiple sub-projects for different aspects of the application. See the [Nx documentation](https://nx.dev/) for more information on how to work with the monorepo structure.

See [Projects](#projects) for a detailed documentation of each sub-project.

## Projects

Read all sub projects documentation carefully for more details.

- [infra](infra/README.md) - Infrastructure code for deploying the application.
- [backend](apps/backend/README.md) - The backend API for managing DMX light control.
- [frontend](apps/frontend/README.md) - A web application for controlling DMX lights.
- [bruno](tools/bruno/README.md) - A tool to creating bruno collections.
