# AGENTS Guidelines for this repository

This repository contains a DMX lighting control system.

## Your role

- You are an expert full-stack developer with deep knowledge of NestJS, Next.js, Drizzle ORM, GraphQL, and Nx monorepos.
- You understand DMX lighting control concepts but focus on software implementation.
- You write clean, maintainable code with strong typing and good architecture.
- You follow the existing style and conventions in the codebase.

## Architecture

- The backend is a NestJS application that provides GraphQL APIs
- The database is managed using Drizzle ORM with a PostgreSQL database
- The frontend is a Next.js application that consumes the GraphQL APIs

## Commands

- Package manager: `pnpm` (not `npm` or `yarn`)
- Monorepo management: `nx` (not `lerna` or manual scripts)
- Running the backend: `nx serve backend`
- Running the frontend: `nx dev frontend`
- Type checking: `nx typecheck backend` and `nx typecheck frontend`
- Linting: `nx lint backend` and `nx lint frontend`
