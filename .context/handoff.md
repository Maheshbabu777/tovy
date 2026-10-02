# Handoff: what a fresh clone does not have

For a new session (for example a local Claude) picking this project up. Written 2026-10-02. If this disagrees with the code, trust the code and fix this file.

## 1. Not in the repository (you must supply or re-create)

| Item | Where it lives | What to do |
|---|---|---|
| `.env` (git-ignored) | your machine | Copy `.env.example`. Needs `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the dev project's public values). For e2e tests also `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_API_KEY` (the project's **secret** key, tests use it to create users). Never commit or paste the secret key. |
| Supabase dev project | supabase.com dashboard | Project URL, anon key and secret key are under Project Settings, API. Schema comes from `supabase/migrations/0001` to `0008`. |
| Supabase Auth settings | dashboard, Authentication | Email OTP enabled, **custom SMTP** (Gmail SMTP with an App Password, entered only in the dashboard) so codes can be sent, password minimum length 14, Site URL and Redirect URLs set to the local and Vercel addresses. Google provider needs a Google Cloud OAuth client (type Web) with `https://<project ref>.supabase.co/auth/v1/callback` as redirect URI. Details: `.context/specs/auth-email-code.md` (Setup) and README. |
| GitHub Actions secrets | repo settings | `SUPABASE_ACCESS_TOKEN`, `DEV_PROJECT_REF`, `DEV_DB_PASSWORD`. CI applies migrations to the dev project when a PR merges to `main` (`.github/workflows/migrate-dev.yml`). Nobody edits the dashboard schema by hand. |
| Vercel project | vercel.com | Imports the GitHub repo, settings from `vercel.json`, env vars `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Deploys `main`, previews per branch. A `.me` custom domain is planned (Vercel Domains plus the Supabase redirect list). |
| `.powers/` | git submodule | Clone with `--recurse-submodules` (or `git submodule update --init`). `AGENTS.md` tells the agent to follow `.powers/SKILL.md`. |
| `node_modules`, `dist`, `.expo`, `test-results` | generated | `npm ci` (the `.npmrc` sets `legacy-peer-deps`, Expo SDK 57 needs it). |
| Chromium for e2e and screenshots | machine | Playwright needs a Chromium. Set `CHROMIUM_PATH` if the default path is wrong. The e2e helper routes Supabase calls through Node because the cloud sandbox browser could not reach Supabase; on a normal machine this still works. |
| Model/session memory | Anthropic cloud sessions | Nothing carries over. Read `.context/` instead: `project.md`, `preferences.md`, `decisions.md`, `design/design-spec.md` (the human's full design, the source of truth for UI), `specs/`. |

## 2. How to run and check

- `npm ci`, then `npx expo start` (press `w` for web, or scan the QR with Expo Go).
- Before a PR: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, and `bash supabase/tests/run.sh` if SQL changed.
- e2e (hits the real dev Supabase): `npx expo export --platform web`, export the `.env` values, `npx serve dist -s -l 8081` is started by the Playwright config or by hand, then `npm run test:e2e` (`-g "name:"` for one test). Run the whole suite once per change that touches behaviour.
- Screenshots of every screen at 430 and 1280 px in light and dark: `node tools/screenshots.mjs <outdir> [today inbox projects project task profile ...]` (needs the exported build served on 8081 and the env values; it creates and deletes temporary users).
- Commit rules (enforced by a hook, never use `--no-verify`): `type: lowercase description`, subject at most 72 characters, body at most 3 lines. Branch names meaningful (`feat/...`). No em or en dashes in anything users read. PRs are squash merged. See `.context/preferences.md`.

## 3. What exists (all on `main`)

Auth by emailed code and Google (web), profile step, per-user local-first store with Supabase sync (Legend-State), tasks with subtasks, projects, soft delete with Undo, partial progress with an append-only log and points (1.5 per percent, 150 closes the ring), the AI approval Inbox (proposals table, approve and reject), Today with hero ring, In progress and a Ring closed overlay, Projects tab, task detail panel, Profile as a settings screen (edit profile, appearance, sync status, about, sign out), light and dark themes with three accents, Geist fonts. 28 e2e tests, 47 unit tests, row security SQL tests.

## 4. Not built yet (from `design/design-spec.md`)

- **Routines and streaks**: routines section, streak screen, heatmap, freezes, streak line on the hero card (11.13, 7.28, 7.29). Needs tables.
- **Calendar** (11.12), **search and command palette** (11.8), keyboard shortcut help.
- **Quick add parsing** (dates and times from words, 11.7) and the full date, reminder and repeat sheet (11.10).
- **Reminders and notifications** (web and phone), preferences screen (11.19), haptics.
- **Connected apps and the MCP server** (11.20 to 11.25): nothing creates proposals for real users yet, so the Inbox is empty outside tests. This needs a server side piece (for example a Supabase Edge Function exposing MCP) with auth, permissions (read only, read and propose, auto-approve), activity feed and prompt kit.
- **Onboarding, splash, welcome** (11.1, 11.2, 11.5), **export data** and **delete account** (11.26, 11.17), About links.
- Task detail: attachments, AI badge on task rows, switching a deep task back to quick from the screen.
- Native check: the Inbox swipe gestures, the slider and haptics have not been run on a phone. Expo Go has not been tested by anyone yet. The real emailed-code flow has not been checked end to end by the human.
- Production Supabase project does not exist (dev only).

## 5. Known weak spots, be honest about them

- The human is not satisfied with the overall UX. They want screens to feel like a real, polished app (navigation, settings, components), not generated. Judge every screen from the user's point of view and show only what is useful. Look at screenshots next to `design/figma-*.png` before writing tests.
- Sync uses Legend-State's `syncedSupabase` with a serial write queue in `src/core/sync/tasks.ts`. It has quirks that tests cover (the plugin drops a row once a delete is confirmed, so Undo restores the whole row; updates are de-duplicated for 2 s). Read the comments there before touching it.
- Inactive tabs stay mounted on web, so a test id can exist twice. e2e helpers use `:visible` locators.
- Expo Router: use the headless `expo-router/ui` tabs (see `Shell.tsx`); detail panels open through the `?task=` search param, Projects and Profile sub pages through `?id=` and `?page=`.
- A hidden `data-sync` attribute on `<html>` (written by `SyncProbe`) is how tests wait for sync. Do not show sync state to users except the offline and error banners and the Profile row.
- A couple of e2e tests were timing sensitive (`8:` local write speed varied once under load). Re-run before assuming a real failure.

## 6. A starting prompt for the local Claude

> Read `AGENTS.md`, `.context/project.md`, `.context/preferences.md`, `.context/handoff.md` and `.context/design/design-spec.md`. Set up `.env` from `.env.example` (I will give you the Supabase values; never write the secret key anywhere except `.env`). Run the checks in section 2 to confirm everything passes. Then take the next item from section 4 by writing a spec in `.context/specs/` first, and build it in slices, looking at screenshots against the design before running tests. I care most about the UI and flow feeling like a real app.
