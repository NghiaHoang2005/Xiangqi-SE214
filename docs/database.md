# Database

PostgreSQL 16, accessed through TypeORM from `apps/server/src/database`. Tables follow SRS 8.2.
The schema changes only through migrations (`synchronize` is off).

## Entity relationship diagram

```mermaid
erDiagram
  guest_session ||--o{ room : hosts
  guest_session ||--o{ room_seat : sits
  room ||--o{ room_seat : "has (max 2)"
  room |o--o{ match : starts
  guest_session |o--o{ match : "plays red / black"
  match ||--o{ move : "commits"

  guest_session {
    uuid guest_id PK
    varchar nickname "optional"
    char reconnect_token_hash UK "SHA-256, raw token never stored"
    timestamptz last_seen_at
    timestamptz expires_at "30 days idle"
  }
  room {
    varchar room_id PK ">=128-bit random"
    char join_code UK "8 chars"
    room_status status
    jsonb time_control
    side_preference preferred_side
    uuid host_guest_id FK
    timestamptz expires_at "30 min idle"
  }
  room_seat {
    varchar room_id PK, FK
    side side PK
    uuid guest_id FK "unique per room"
    connection_state connection_state
    timestamptz disconnected_at "reconnect grace starts here"
  }
  match {
    uuid match_id PK
    game_mode mode
    varchar room_id FK "PVP only"
    uuid red_guest_id FK
    uuid black_guest_id FK
    side ai_side "PVE only"
    ai_difficulty ai_difficulty "PVE only"
    match_status status
    side turn
    int version "increases on every commit"
    jsonb snapshot
    jsonb clocks
    side winner
    end_reason end_reason
    timestamptz ended_at "retention 30 days"
  }
  move {
    uuid match_id PK, FK
    int ply PK
    uuid move_id UK "per match, idempotency"
    actor_type actor_type
    uuid guest_id "null for AI"
    jsonb from_square
    jsonb to_square
    jsonb capture
    jsonb clock_after
    char state_hash
  }
```

## Rules enforced by the database

| Rule                                        | How                          | SRS   |
| ------------------------------------------- | ---------------------------- | ----- |
| A room has at most two seats, one per side  | PK `(room_id, side)`         | FR-04 |
| One guest cannot take both seats            | unique `(room_id, guest_id)` | FR-04 |
| A ply is committed once per match           | PK `(match_id, ply)`         | 8.3   |
| A retried `SubmitMove` cannot commit twice  | unique `(match_id, move_id)` | 3.3   |
| PVE matches name the AI side and difficulty | check `chk_match_pve_has_ai` | FR-30 |
| Deleting a match deletes its moves          | FK `ON DELETE CASCADE`       | BR-20 |

## Not in this schema yet

- Accounts, refresh tokens, ranked queue and Elo settlement come with US-37 and later. `match` will
  then also reference accounts (the SRS data model only links matches to guests).
- Retention jobs (delete expired guests, rooms and old matches) come with US-46; the `expires_at`
  and `ended_at` indexes are already there for them.

## Changing the schema

1. Edit or add an entity in `apps/server/src/database/entities` (and add new ones to `ENTITIES`).
2. `pnpm build`, then in `apps/server`: `pnpm db:generate src/database/migrations/<Name>`.
3. Read the generated SQL. TypeORM creates a shared enum type once per column that uses it
   (for example `side`); delete the duplicate `CREATE TYPE` and keep the matching `DROP TYPE`
   only after the last table that uses it.
4. Use `import type { MigrationInterface, QueryRunner }` at the top of the migration.
5. `pnpm db:migrate`, `pnpm db:revert`, `pnpm db:migrate` to check both directions, then commit.
