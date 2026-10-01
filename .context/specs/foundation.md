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
8. A separate prod Supabase project (Mumbai) exists, and pushing a release tag like `v0.1.0` applies the migrations to prod through CI. Merging to `main` never touches prod. A test tag shows the migration in prod and nothing else changes.

## Out of scope

- Google and email OTP login (next spec, `auth`).
- `tokens.ts` and the `/dev/components` gallery (spec `design-tokens`).
- Real Tovy tables (tasks, projects, progress logs). The `notes` table stays as the only table until Phase 2.
- Running the e2e suite in CI (needs secrets and a live project). It stays a manual command for now.
- Deploying the app anywhere (Cloudflare Pages, EAS). Only database migrations are deployed.

## Open questions

- Split Phase 1 into three specs, `foundation`, `auth`, `design-tokens`? Answer: yes (2026-10-01).
- Promote the spike into the real structure or start fresh? Answer: promote the spike (2026-10-01).
- ESLint with the Expo config, Prettier, Jest with `jest-expo`? Answer: yes (2026-10-01).
- One dev project only, or create prod now? Answer: create prod now too (2026-10-01). This added criterion 8.
- For you to do, I can't (needed for criteria 5 and 8): create the prod Supabase project in Mumbai, and add these GitHub Actions secrets: `SUPABASE_ACCESS_TOKEN`, `DEV_PROJECT_REF`, `DEV_DB_PASSWORD`, `PROD_PROJECT_REF`, `PROD_DB_PASSWORD`. Answer: pending.
- Is one real unit test enough for criterion 2 now? There is little pure logic yet (the plan puts rules in Phase 5 and 7). I propose testing the notes store functions without persistence, and adding more as `src/core/` grows. (proposed) Answer: pending.

## Plan

Slices, each ends green and gets ticked below. Branch: `feat/foundation`. One PR at the end of each group of slices, small enough to review.

1. **Move the app to the root (criterion 1).** `git mv` the spike into the plan's structure: `spike/src/app` to `app/`, `spike/src/lib/supabase.ts` to `src/core/db/`, the notes sync and persist plugins to `src/core/sync/`, assets and `app.json` to the root, rename the app from "Tovy spike" to "Tovy". Merge `spike/package.json` into a root `package.json`. Delete `spike/`. Test: `npm run typecheck` and `npx expo export --platform web` pass, then the e2e command (slice 6) still signs in and lists notes.
2. **Quality commands (criterion 2).** ESLint flat config with `eslint-config-expo`, Prettier config, Jest with `jest-expo`, scripts `lint`, `format`, `format:check`, `typecheck`, `test`. One real unit test for the notes store (proposed). Fill the Commands table in `.context/project.md`. Test: all four commands pass on a fresh clone with `npm ci`, and each fails when I break a rule on purpose (shown in the evidence).
3. **Row security test in CI form (criterion 4).** Turn `supabase/tests/run-local.sh` into one that works on a plain Postgres service container (no `runuser`), keep the stub file. Test: it passes locally and fails when I temporarily drop a policy.
4. **CI workflow (criterion 3).** `.github/workflows/ci.yml` on pull requests: install, lint, format check, typecheck, unit tests, row security test. Test: a PR with a lint error shows red, the fix shows green.
5. **Migrations to dev (criterion 5).** `.github/workflows/migrate-dev.yml` on push to `main`: Supabase CLI `link` and `db push` with the dev secrets. Test: a throwaway migration (a comment-only change to a function) in a test PR, then check it applied via the Supabase API.
6. **E2E move (criterion 7).** Move `spike/tests/sync.e2e.ts` and the Playwright config to `tests/e2e/`, update paths and the `test:e2e` script. Test: the 7 e2e tests pass with the same command.
7. **Prod migrations on tag (criterion 8).** `.github/workflows/migrate-prod.yml` on tags `v*`, using the prod secrets. Needs the prod project from you first. Test: a `v0.0.1` tag applies the notes migration to prod, and a merge to `main` alone does not.
8. **README and env (criterion 6).** README from the plan's scaffold, `.env.example` for app and CI variables, remove the stale "applied by hand" gotcha from `project.md`. Test: I follow the README from a clean clone and it runs.

Proof at the end: `.powers/scripts/verify.sh` evidence block pasted under Notes, and each criterion's pass or fail with its command.

Risks:
- Expo SDK 57 with `jest-expo` and ESLint 9 may need `--legacy-peer-deps` again. If they conflict, record the workaround in `project.md` and do not downgrade Expo.
- Moving files can break Metro path resolution and the `app.json` entry. Slice 1 is verified by a web build before anything else changes.
- The Supabase CLI in CI needs the database password and a network path from GitHub runners. If it fails, fall back to applying the SQL through the Management API and say so in the notes.
- Applying migrations to prod automatically is irreversible. That is why prod only runs on tags, never on merge, and the first prod run happens with you watching.
- Row security test on a plain Postgres uses stubs for Supabase's `auth` schema. The real project test (REST, two users) already exists in the e2e suite and keeps covering that gap.

## Progress

- [x] Questions answered
- [x] Plan written
- [ ] Spec and plan approved (human)
- [ ] 1 Move the app to the root
- [ ] 2 Quality commands
- [ ] 3 Row security test in CI form
- [ ] 4 CI workflow
- [ ] 5 Migrations to dev
- [ ] 6 E2E move
- [ ] 7 Prod migrations on tag (needs prod project and secrets from the human)
- [ ] 8 README and env

## Notes

- The "applied by hand" gotcha in `.context/project.md` goes away when criterion 5 lands.
- Legend-State stays pinned to the beta that passed the spike. Re-run the e2e suite on any upgrade.
