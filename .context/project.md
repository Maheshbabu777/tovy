# tovy

Last verified: 2026-10-01 at commit 08d19f4

## What it is

Tovy is a local-first task and routine app that connects to the AI apps people already use (via MCP, writing directly, with an activity log, undo and Trash), with real partial progress per task, streaks with freezes and an effort heatmap. Android and web first. Full plan: `.context/project-plan.md`.

## Out of scope

XP and levels, achievements, weekly recap, widgets, calendar sync, document library, multi-AI chat, native iOS, sharing (all after v1).

## Stack

Built: Expo (React Native, TypeScript) with Expo Router, Legend-State v3 beta local store, Supabase dev project, GitHub Actions CI. Web hosting on Vercel is configured (`vercel.json`) but the Vercel project is not created yet. Planned, not built: EAS, a prod Supabase project.

## Commands

| Task | Command |
|---|---|
| Install | `npm ci` (the `.npmrc` sets legacy-peer-deps) |
| Run locally | `npx expo start` (scan the QR code with Expo Go, or press w for web) |
| Unit tests | `npm test` |
| All tests | `npm test` ; `npm run test:e2e` (needs Supabase reachable and a fresh `expo export`) ; `bash supabase/tests/run.sh` (row security, local Postgres) ; in `supabase/functions/mcp`: `deno test --allow-env` (MCP server) |
| One test | `npm run test:e2e -- -g "2:"` |
| Lint | `npm run lint` ; format: `npm run format:check` (fix with `npm run format`) |
| Type check | `npm run typecheck` |
| Build | `EXPO_PUBLIC_SUPABASE_URL=$SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY npx expo export --platform web` |

## Layout

<!-- One line per important folder or entry point. Pointers, not descriptions of the code. -->
- `.context/project-plan.md` - the approved plan and slice list
- `app/` - Expo Router screens; `src/core/db/` Supabase client; `src/core/sync/` per-user tasks store and sync; `tests/e2e/` Playwright sync tests
- `supabase/migrations/` - schema; `supabase/tests/` - row security test and runner (uses `DATABASE_URL` or a throwaway local Postgres)
- `supabase/functions/mcp/` - the MCP server for AI apps (Deno, its own `supabase/functions/mcp/deno.json`; not linted or type checked by the app's tools)

## Conventions

<!-- Only ones you can see in the code or the human told you. -->
- Prettier decides style: no semicolons, single quotes, 120 columns (`.prettierrc.json`). CI fails on `npm run format:check`.
- Commit subjects are `type: description` and a hook checks them. PRs are squash merged into `main` from a named branch (`feat/...`, `docs/...`), never from a random one.
- Platform-specific code uses `.web.ts` files next to the native one (for example `persistPlugin.web.ts`).
- Schema changes are numbered files in `supabase/migrations/`, one change per file.

## Gotchas

<!-- One line each, with a file path. Things that cost time to discover. -->
- Cloud sandbox: Chromium cannot reach Supabase, Node can, so tests fetch from Node and bridge the websocket by hand (`tests/e2e/sync.e2e.ts`).
- Migrations reach the dev project only when they merge to `main` (`.github/workflows/migrate-dev.yml`). Never edit the dashboard by hand. The app shows `synced` even if the table is missing (`src/core/sync/tasks.ts`).
- Never clear synced data by emptying its observable (it would sync as deletes). Use `store.dispose()` (`syncState(obs$).reset()`), and keep one store per user (`src/core/sync/tasks.ts`).
- An AI app's token also works against the REST API directly, so rules for AI apps live in row security and triggers (`supabase/migrations/0009_ai_connection.sql`), never only in the MCP server.
- `waitSynced` in the e2e tests can pass on a stale "synced" label. When a test needs a note really saved, poll the server for it (`serverTitles`).

## Ask the human

<!-- Questions bootstrap couldn't answer. Delete each one once it's answered and written above. -->
