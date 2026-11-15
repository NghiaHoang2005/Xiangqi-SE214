# Xiangqi-SE214 — Online Xiangqi Platform

SE214 course project, Group 06. A web app for playing xiangqi (Chinese chess): 1v1 with a friend in a private room, against the computer, or in Elo-rated ranked matches.
Specification: `SRS-SE214-XQ-01`.

## Structure

```
apps/
  server/      NestJS + Socket.IO — authoritative game state (rules, clock, AI, persistence)
  web/         React + TypeScript + Vite
packages/
  rules/       Xiangqi Rules Engine, shared by the server (move validation) and the web app (move hints)
  shared/      Socket.IO event names, error codes, baseline constants (SRS 9.3, 9.4, 14)
docker-compose.yml   PostgreSQL + server + web
```

## Requirements

- Node.js 22 or later
- pnpm 10: `corepack enable` (ships with Node) or `npm i -g pnpm`
- Docker (for PostgreSQL or the full stack)

## Development

```bash
pnpm install
pnpm build                 # build packages/shared and packages/rules the first time
cp .env.example .env
docker compose up -d db    # start PostgreSQL only (also creates the xiangqi_test database)
pnpm --filter @xiangqi/server db:migrate   # create or update the tables
pnpm dev                   # server on :3000, web on :5173 (web proxies /api and /socket.io to the server)
```

Open http://localhost:5173. After changing code in `packages/*`, run `pnpm build` again (or `pnpm --filter @xiangqi/rules build`).

## Run the full stack with Docker (demo)

```bash
cp .env.example .env
docker compose up --build
```

Web: http://localhost:8080 · API: http://localhost:3000/api/health

## Common commands

| Command                                      | What it does                                |
| -------------------------------------------- | ------------------------------------------- |
| `pnpm lint`                                  | Run ESLint on the whole repo                |
| `pnpm format`                                | Reformat code with Prettier                 |
| `pnpm build`                                 | Build all packages and apps                 |
| `pnpm typecheck`                             | Type-check (run `pnpm build` first)         |
| `pnpm test`                                  | Run tests (Vitest)                          |
| `pnpm --filter @xiangqi/rules test:coverage` | Rules Engine coverage (target ≥80%, NFR-14) |

Database commands (Prisma, in `apps/server`): `pnpm db:migrate` applies migrations, `pnpm db:migrate:dev --name <change>` creates one after editing `prisma/schema.prisma`, `pnpm db:status` and `pnpm db:studio` inspect the database. See [docs/database.md](docs/database.md) for the schema and rules.

Server tests that need PostgreSQL read `TEST_DATABASE_URL` and **wipe that database**. Without it they are skipped; CI always runs them.

## Workflow

- One branch per Jira **sub-task**, named with that sub-task's key: `feature/SCRUM-<number>-<short-description>`; bug fixes use `fix/SCRUM-<number>-...`. Use the Jira key (e.g. `SCRUM-133`), not the `US-xx` label in the story title. Put the same key in the PR title.
- Jira moves the issue automatically: branch created → **In Progress**, PR opened → **In Review**, PR merged into `main` → **Done**. When every sub-task of a story is Done, the story moves to Done; when every story of an epic is Done, the epic moves to Done.
- Use the **story** key only for work that has no sub-task. Do not put a story key on a PR that finishes just one sub-task: merging it would close the whole story.
- Write commit messages, code comments and PR descriptions in **English**. Text shown in the UI stays in Vietnamese (FR-25).
- Follow [Conventional Commits](https://www.conventionalcommits.org/) and include the Jira key: `feat(server): validate state version on SubmitMove (SCRUM-<number>)`. Common types: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`. Once Jira is connected to GitHub, commits and PRs show up on the matching issue.
- Open PRs against `main`. CI must pass and at least one review is required. Reviewers are requested automatically from `.github/CODEOWNERS`.
- When you rename an event, change a payload or add an error code, update `packages/shared` so FE and BE stay in sync.
- Never commit `.env` or any other secret.
