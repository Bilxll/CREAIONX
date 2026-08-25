# Community Platform — Phase 1 Scaffold

Discord-style platform with an earn-first virtual economy (Sparks/Gems).
This scaffold covers the **Phase 1 MVP core** from the spec: schema, server
boot, and seed data. Auth, real-time message handlers, and the events/reward
logic get built out in the next pass.

## Stack (Phase 1 only — see spec Section 6.1 for full picture)

- **Backend**: Node.js + Express + TypeScript
- **Realtime**: Socket.io (wired in, handlers TBD)
- **DB**: PostgreSQL via Prisma ORM
- **Auth**: not yet wired — plan is Clerk or Supabase Auth (don't hand-roll)

## Setup

1. Get a Postgres database. Easiest options: [Supabase](https://supabase.com),
   [Neon](https://neon.tech), or [Railway](https://railway.app) — all have free tiers.
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the migration to create all tables:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Seed some starter data (a server, roles, one event, a few store items):
   ```bash
   npm run prisma:seed
   ```
6. Start the dev server:
   ```bash
   npm run dev
   ```
   Health check: `http://localhost:4000/health`

## What's in this scaffold

- `prisma/schema.prisma` — full Phase 1+ data model, matching spec Section 6.3
  table-for-table, plus the constraints called out in Section 6.4:
  - `currency_transactions` has a `@@unique([userId, refId, reason])` constraint
    so reward batch jobs are idempotent (Section 4.4).
  - `event_participants` (DB join) and `attendance_log` (verified presence) are
    separate tables — "joined" and "was present" are different facts (Section 4.3).
  - Wallet balances on `User` are meant to be written **only** alongside a
    `CurrencyTransaction` row, in the same DB transaction. Nothing enforces this
    at the schema level (Postgres can't express that constraint), so it's a rule
    for every write path — the reward-distribution service is the reference
    implementation to follow.
- `prisma/seed.ts` — creates one server, three roles, two channels, one
  scheduled trivia event, and a small store catalog.
- `src/index.ts` — Express + Socket.io boot. Routes and socket handlers are
  stubbed with comments showing where each module mounts.

## Not in this scaffold yet (next steps)

In priority order per the spec's phased plan:
1. Auth wiring (Clerk/Supabase) + protected routes
2. Server/channel CRUD + membership endpoints
3. Real-time messaging over Socket.io (join channel room, broadcast, persist)
4. Events lifecycle state machine (`DRAFT → SCHEDULED → LIVE → ENDED → REWARDS_DISTRIBUTED`)
5. Reward distribution batch job (the idempotent transaction described in spec Section 4.4)
6. Store/inventory equip endpoints

Say the word and I'll build any of these next.
