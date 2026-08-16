# dmx-light-control

## Development setup

- Install Docker and Docker Compose for running the local database. It doesn't matter which docker engine you use, as long as it supports `docker` and `docker compose`.
- Install Node.js **24.19.0** (see `package.json` `engines`).
- Install pnpm **^11.21.0** (see `package.json` `devEngines`).
- Install project dependencies:

```bash
pnpm install
```

Nx is provided by the workspace — run `nx` commands directly (no global install or `pnpm` prefix needed).

- copy .env.example to .env and fill in the required environment variables

## Nx monorepo

The dmx-light-control project is a monorepo managed with Nx, which contains multiple sub-projects for different aspects of the application. See the [Nx documentation](https://nx.dev/) for more information on how to work with the monorepo structure.

See [Projects](#projects) for a detailed documentation of each sub-project.

## Projects

Read all sub projects documentation carefully for more details.

- [infra](infra/README.md) - Local Docker infrastructure (PostgreSQL database).
- [backend](apps/backend/README.md) - NestJS GraphQL API for fixture catalog data and DMX/MIDI IO.
- [frontend](apps/frontend/README.md) - Next.js UI for fixture and fixture-vendor management.
- [bruno](tools/bruno/README.md) - A tool for creating Bruno API collections.
