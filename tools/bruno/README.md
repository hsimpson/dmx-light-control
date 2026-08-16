# Bruno tools

Builds a [Bruno](https://www.usebruno.com/) API collection in [OpenCollection](https://www.opencollection.com/) YAML (`.yml` requests under `collection/`, rooted by `collection/opencollection.yml`).

## Commands

Requires a running backend for schema introspection (`http://localhost:$BACKEND_PORT/graphql`, default port 3000). Re-run after GraphQL resolver or DTO changes. The committed `collection/environments/local.yml` `backendUrl` is independent of `BACKEND_PORT`.

```bash
nx run bruno:build
```

This regenerates:

- `schema.graphql` (introspection dump for debugging)
- `collection/graphql/queries/*.yml` and `collection/graphql/mutations/*.yml` (one request per root field)

It does not rewrite `collection/opencollection.yml` or `collection/environments/`.
