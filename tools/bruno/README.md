# Bruno tools

Builds a [Bruno](https://www.usebruno.com/) API collection in [OpenCollection](https://www.opencollection.com/) YAML (`.yml` requests under `collection/`, rooted by `collection/opencollection.yml`).

## Commands

Requires a running backend for schema introspection. The build runs with cwd `tools/bruno` and `dotenv/config`, so it does **not** load the workspace-root `.env`; it uses `BACKEND_PORT` from the process environment, otherwise `3000`. Re-run after GraphQL resolver or DTO changes. The committed `collection/environments/local.yml` `backendUrl` is independent of `BACKEND_PORT`.

```bash
nx run bruno:build
```

This regenerates:

- `schema.graphql` (introspection dump for debugging)
- `collection/graphql/` (wiped and rebuilt: `folder.yml` plus one request `.yml` per root field under `queries/` and `mutations/`)

It does not rewrite `collection/opencollection.yml` or `collection/environments/`.
