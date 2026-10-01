# Foundation

Status: draft

## Problem

The sync spike proved the stack, but it lives in a throwaway `spike/` folder with no lint, no format check, no unit tests and no CI, and its database migration had to be applied by hand in the Supabase editor. Every later feature needs a real app structure, automatic quality checks on each PR, and migrations that apply themselves, so mistakes are caught before they reach a phone or the database.

This is Phase 1 of `.context/project-plan.md`, first part. Login and design tokens are split into their own specs (see open questions).

## Acceptance criteria

1. The app lives at the repo root in the structure from the plan (`app/`, `src/core/`, `src/features/`, `src/ui/`, `supabase/`, `tests/`). The spike's working code is moved there (sync layer to `src/core/sync/`, Supabase client to `src/core/db/`). The `spike/` folder is gone. `npx expo export --platform web` builds and the web app still signs in and lists notes.
2. `npm run lint`, `npm run format:check`, `npm run typecheck` and `npm test` (unit tests) all exist and pass on a clean checkout, and are listed in the Commands table in `.context/project.md`.
3. A GitHub Actions workflow runs lint, format check, typecheck, unit tests and the row-security SQL test on every pull request, and a PR with a deliberately failing check shows red.
4. The row-security SQL test (user A cannot read or change user B's rows) runs in CI against a throwaway Postgres, so it no longer needs a manual run.
5. When a PR merges to `main`, CI applies the new files in `supabase/migrations/` to the dev Supabase project with the Supabase CLI. A migration added in a test PR shows up in the dev database without anyone opening the Supabase editor.
6. `README.md` follows the plan's scaffold (overview, getting started, how-to, reference) and `.env.example` lists every variable the app and CI need. A reader can get the app running from the README alone.
7. The sync e2e suite (7 tests from the spike) moves to `tests/e2e/` and still passes against the dev project with the same command.

## Out of scope

- Google and email OTP login (next spec, `auth`).
- `tokens.ts` and the `/dev/components` gallery (spec `design-tokens`).
- Real Tovy tables (tasks, projects, progress logs). The `notes` table stays as the only table until Phase 2.
- Running the e2e suite in CI (needs secrets and a live project). It stays a manual command for now.
- Deploying anything (Cloudflare Pages, EAS).

## Open questions

- Split Phase 1 into three specs, `foundation`, `auth`, `design-tokens`, as written above? I recommend yes: each ends with a checkable proof and a small PR. Answer: pending.
- Promote the spike into the real structure (criterion 1) or start a fresh app and port pieces? I recommend promoting, because the code is proven and the history stays. Answer: pending.
- CI needs two GitHub secrets from you for criterion 5: a Supabase access token and the dev database password. I can't create them. Add them under the repo's Settings, Secrets and variables, Actions. Answer: pending.
- Linter and formatter: ESLint with the Expo config (already a dev dependency) and Prettier. Unit tests with Jest (`jest-expo`). (proposed) Answer: pending.
- Keep the current Supabase dev project as the only environment for now, with prod created later before real users? (proposed) Answer: pending.

## Plan

<!-- Filled in step 3, after the open questions are answered. -->

## Progress

- [ ] Questions answered, plan written, spec approved

## Notes

- The "applied by hand" gotcha in `.context/project.md` goes away when criterion 5 lands.
- Legend-State stays pinned to the beta that passed the spike. Re-run the e2e suite on any upgrade.
