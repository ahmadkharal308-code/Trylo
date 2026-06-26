# Trylo.pk

A curated fashion marketplace for Pakistan — a more trustworthy, more personalized
alternative to Daraz. Swipe-based discovery → behavioral memory → virtual try-on, built on
a two-gate seller trust system.

- **Product & technical source of truth:** [`Trylo_Technical_Specification.md`](./Trylo_Technical_Specification.md)
- **Build constraints & process (auto-loaded by Claude Code):** [`CLAUDE.md`](./CLAUDE.md)
- **Reference material (prototype, original PDFs):** [`docs/`](./docs/)

## Repository layout

This is a light monorepo. Each app lives under `apps/`.

```
Trylo/
├── CLAUDE.md                        # build constraints + process
├── Trylo_Technical_Specification.md # the product/technical spec
├── docs/                            # reference-only material (prototype, original PDFs)
├── docker-compose.yml               # local PostgreSQL for development
└── apps/
    └── backend/                     # API + data model (NestJS + Prisma + PostgreSQL)
        # apps/frontend/ will be added in a later milestone (React, mobile-first web)
```

## Current status — Milestone 1: backend skeleton + data model

This milestone delivers **only** the backend application skeleton and the PostgreSQL data
model (schema + migration). No business features yet — seller onboarding, search,
swipe/discovery, recommendations, and try-on are deliberately out of scope until later
milestones. The domain folders under `apps/backend/src/modules/` are intentionally empty
placeholders that show where each future milestone will live.

## Getting started (local development)

You need [Node.js](https://nodejs.org/) (v20+) and [Docker](https://www.docker.com/)
installed.

```bash
# 1. Start a local PostgreSQL database
docker compose up -d

# 2. Set up the backend
cd apps/backend
cp .env.example .env          # default values already point at the local database
npm install

# 3. Create the database tables from the schema
npm run prisma:migrate        # applies the migration to your local database

# 4. Run the backend
npm run start:dev             # http://localhost:3000

# Health check (confirms the app and database are alive):
#   GET http://localhost:3000/health
```

## Tech stack (this milestone)

| Layer        | Choice                          | Why (plain-language)                                                  |
| ------------ | ------------------------------- | -------------------------------------------------------------------- |
| Backend      | Node.js + TypeScript (NestJS)   | Same language as the future React frontend; structured, scalable.    |
| Database     | PostgreSQL                      | Reliable relational store for users, products, orders, disputes.     |
| DB toolkit   | Prisma                          | Type-safe database access + readable, version-controlled migrations. |

Search service, object storage, and the try-on vendor are chosen in their own milestones
(see the spec, Section 12).
