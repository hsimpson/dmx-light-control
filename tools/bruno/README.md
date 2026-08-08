# Bruno tools

Builds a [Bruno](https://www.usebruno.com/) API collection in [OpenCollection](https://www.opencollection.com/) YAML (`.yml` requests under `collection/`, rooted by `collection/opencollection.yml`).

## Commands

Requires a running backend (default port from `BACKEND_PORT`, else 3000).

```bash
nx run bruno:build
```

This regenerates:

- `schema.graphql` (introspection dump for debugging)
- `collection/graphql/queries/*.yml` and `collection/graphql/mutations/*.yml` (one request per root field)

It does not rewrite `collection/opencollection.yml` or `collection/environments/`.
