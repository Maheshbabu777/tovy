# Tovy

> Tasks that count the effort, not just the checkbox.

## Overview

Tovy is a local-first task and routine app that connects to the AI apps you already use. Tasks carry partial progress with a log, streaks forgive a missed day, and everything works offline. Android and web first.

Status: foundation phase. The app today is the proven sync layer (a notes list that syncs through Supabase). The full plan is in `.context/project-plan.md`.

## Getting started

1. Clone with submodules: `git clone --recurse-submodules https://github.com/Maheshbabu777/tovy`
2. Install: `npm ci` (the `.npmrc` sets `legacy-peer-deps`, which Expo SDK 57 needs)
3. Copy `.env.example` to `.env` and add the dev Supabase URL and anon key
4. Run: `npx expo start`, then scan the QR code with Expo Go, or press `w` for the web build
5. Sign in with **Continue with Google** (web). The sign-in screen still shows the spike's email and password form until the email code spec lands (`.context/specs/auth-email-code.md`)

## How-to guides

- Check everything before a PR: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`. Fix formatting with `npm run format`.
- Run the row security test: `bash supabase/tests/run.sh` (starts a throwaway local Postgres, or uses `DATABASE_URL` if set).
- Run the sync tests against the dev project: `EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_ANON_KEY=... npx expo export --platform web`, export the variables from `.env`, then `npm run test:e2e`. One test: `npm run test:e2e -- -g "2:"`.
- Sign in with Google needs these set in Supabase: Authentication, Providers, Google (client ID and secret from a Google Cloud OAuth client of type Web application, with `https://<project ref>.supabase.co/auth/v1/callback` as its redirect URI), and Authentication, URL Configuration with Site URL and Redirect URLs set to `http://localhost:8081`.
- Add a feature: create a spec with `.powers/scripts/new-spec.sh <slug>`, get it approved, then build in slices.
- Deploy the web app (Vercel): import the GitHub repo in Vercel and keep the settings from `vercel.json` (build `npx expo export --platform web`, output `dist`, every path served by `index.html`). Add the environment variables `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the public anon key only, never the secret key). Then add the Vercel address to Supabase, Authentication, URL Configuration (Site URL and Redirect URLs). A custom domain goes under the Vercel project's Settings, Domains, and into the same Supabase list.
- Add a migration: add the next numbered file to `supabase/migrations/`. CI applies it to the dev project when the PR merges to `main`.

## Reference

- Environment variables: `.env.example`
- Data model: `supabase/migrations/`
- CI: `.github/workflows/ci.yml` (checks on every PR), `.github/workflows/migrate-dev.yml` (migrations on merge)
- Folders: `app/` screens, `src/core/db/` Supabase client, `src/core/sync/` notes store and sync, `tests/e2e/` Playwright tests

## Architecture and decisions

The phone is the primary copy of the data and Supabase is the synced, secured copy. Decisions are recorded in `.context/decisions.md`.

## License

TBD
