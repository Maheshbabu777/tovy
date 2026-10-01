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
| Install | `cd spike && npm install --legacy-peer-deps` |
| Run locally | |
| All tests | `cd spike && npm run test:e2e` (needs Supabase reachable) ; `bash supabase/tests/run-local.sh` (row security, local Postgres) |
| One test file | |
| Lint | |
| Type check | `cd spike && npm run typecheck` |
| Build | `cd spike && EXPO_PUBLIC_SUPABASE_URL=$SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY npx expo export --platform web` |

## Layout

<!-- One line per important folder or entry point. Pointers, not descriptions of the code. -->
- `.context/project-plan.md` - the approved plan and slice list
- `spike/` - throwaway Expo app for the sync spike (src/app screens, src/lib sync)
- `supabase/migrations/` - schema; `supabase/tests/` - row security test and local runner

## Conventions

<!-- Only ones you can see in the code or the human told you. -->
- 

## Gotchas

<!-- One line each, with a file path. Things that cost time to discover. -->
- 

## Ask the human

<!-- Questions bootstrap couldn't answer. Delete each one once it's answered and written above. -->
- 
