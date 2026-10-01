# tovy

Last verified: YYYY-MM-DD at commit <hash>

## What it is

Tovy is a local-first task and routine app that connects to the AI apps people already use (via MCP, with an approval inbox), with real partial progress per task, streaks with freezes and an effort heatmap. Android and web first. Full plan: `.context/project-plan.md`.

## Out of scope

XP and levels, achievements, weekly recap, widgets, calendar sync, document library, multi-AI chat, native iOS, sharing (all after v1).

## Stack

Planned, not built yet: Expo (React Native, TypeScript) with Expo Router, Legend-State local store, Supabase (Mumbai), Cloudflare Pages, EAS.

## Commands

| Task | Command |
|---|---|
| Install | `npm ci` (the `.npmrc` sets legacy-peer-deps) |
| Run locally | `npx expo start` (scan the QR code with Expo Go, or press w for web) |
| Unit tests | `npm test` |
| All tests | `npm test` ; `npm run test:e2e` (needs Supabase reachable and a fresh `expo export`) ; `bash supabase/tests/run-local.sh` (row security, local Postgres) |
| One test | `npm run test:e2e -- -g "2:"` |
| Lint | `npm run lint` ; format: `npm run format:check` (fix with `npm run format`) |
| Type check | `npm run typecheck` |
| Build | `EXPO_PUBLIC_SUPABASE_URL=$SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY npx expo export --platform web` |

## Layout

<!-- One line per important folder or entry point. Pointers, not descriptions of the code. -->
- `.context/project-plan.md` - the approved plan and slice list
- `app/` - Expo Router screens; `src/core/db/` Supabase client; `src/core/sync/` notes store and sync; `tests/e2e/` Playwright sync tests
- `supabase/migrations/` - schema; `supabase/tests/` - row security test and local runner

## Conventions

<!-- Only ones you can see in the code or the human told you. -->
- 

## Gotchas

<!-- One line each, with a file path. Things that cost time to discover. -->
- Cloud sandbox: Chromium cannot reach Supabase, Node can, so tests fetch from Node and bridge the websocket by hand (`tests/e2e/sync.e2e.ts`).
- `supabase/migrations/*.sql` must be applied by hand in the Supabase SQL editor. The app shows `synced` even if the table is missing (`src/core/sync/notes.ts`).

## Ask the human

<!-- Questions bootstrap couldn't answer. Delete each one once it's answered and written above. -->
- 
