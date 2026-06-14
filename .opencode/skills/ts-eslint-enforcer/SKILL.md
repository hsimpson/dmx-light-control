---
name: ts-eslint-enforcer
description: Ensures every code change is TypeScript type-safe and ESLint compliant. Triggers on any task involving file edits in .ts/.tsx files. Always run typecheck and lint after modifications.
---

# TS/ESLint Enforcer

When performing any task that modifies TypeScript files (.ts, .tsx, .d.ts), you MUST follow this workflow:

## Before editing

1. Understand the existing code conventions — check neighboring files for import patterns, naming, and structure.
2. Follow the project's ESLint rules (see `eslint.config.ts` at root, plus overrides in `apps/backend/eslint.config.ts` and `apps/frontend/eslint.config.ts`).
3. Follow the project's Prettier config: `arrowParens: "avoid"`, `printWidth: 120`, `singleQuote: true`, `trailingComma: "all"`.

## After editing

1. Run the appropriate typecheck:
   - For frontend changes: `nx run frontend:typecheck`
   - For backend changes: `nx run backend:typecheck`
2. Run lint on affected projects:
   - For frontend changes: `nx run frontend:lint`
   - For backend changes: `nx run backend:lint`
3. If errors are found, fix them before reporting completion. Do not ask the user to fix lint/type errors yourself.

## Key ESLint rules to respect

- `explicit-member-accessibility: error` — always mark class members as public/private/protected.
- `member-ordering: error` — follow existing member ordering in classes.
- `promise-function-async: error` — any function returning a Promise must be marked async.
- `require-await: error` — async functions must contain await.
- `no-console: warn` — avoid console.log in production code.

## Key style conventions

- 2-space indentation.
- `arrowParens: "avoid"` — omit parens for single arrow function param: `x => x * 2`.
- `singleQuote: true` — use single quotes for strings.
- `trailingComma: "all"` — always add trailing commas in multiline structures.
- `printWidth: 120` — do not exceed 120 characters per line.
