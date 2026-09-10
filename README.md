# dmx-light-control

## Development setup

- Install Docker and Docker Compose for running the local database. It doesn't matter which docker engine you use, as long as it supports `docker` and `docker compose`.
- Install Node.js **24.21.0** (see `package.json` `engines`).
- Install pnpm **^12.4.0** (see `package.json` `devEngines`).
- Install project dependencies:

```bash
pnpm install
```

Nx is provided by the workspace — run `nx` commands directly (no global install or `pnpm` prefix needed).

- Copy root `.env.example` to `.env` and fill in the required environment variables (`BACKEND_PORT` and `POSTGRES_*` have no in-code defaults).
- Copy `apps/frontend/.env.example` to `apps/frontend/.env` (`NEXT_PUBLIC_GRAPHQL_API_URL`).

## Nx monorepo

The dmx-light-control project is a monorepo managed with Nx, which contains multiple sub-projects for different aspects of the application. See the [Nx documentation](https://nx.dev/) for more information on how to work with the monorepo structure.

See [Projects](#projects) for a detailed documentation of each sub-project.

## Projects

Read all sub projects documentation carefully for more details.

- [infra](infra/README.md) - Local Docker infrastructure (PostgreSQL database).
- [backend](apps/backend/README.md) - NestJS GraphQL API for fixture catalog, projects, and DMX/MIDI IO.
- [frontend](apps/frontend/README.md) - Next.js UI for catalog, vendors, projects (patch, universe, 3D), and related views.
- [bruno](tools/bruno/README.md) - Regenerates the Bruno GraphQL collection from a running backend schema.
- [blender](blender/README.md) - Authoring `.blend` files; re-export runtime GLB/GLTF under `apps/backend/src/assets/`.
