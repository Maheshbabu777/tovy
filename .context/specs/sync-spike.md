# Sync spike

Status: approved

## Problem

Tovy must answer every tap in under 100 ms and work fully offline, so each device keeps its own local copy of the data and syncs through Supabase in the background. The whole stack rests on that working. Phase 0 proves it on one small table before anything else is built, and gives a go or no-go on Expo, Legend-State and Supabase.

## Acceptance criteria

1. A throwaway Expo app (phone via Expo Go, plus a web build) signs in with a test user and shows a list of notes from a local store, with add, edit and soft delete.
2. Offline edit: with the network off, add one note and edit another on client A. The list updates instantly. After the network is back, client B shows both changes within 2 s.
3. Offline conflict: client A and client B both edit different notes offline, then reconnect. Both end up with both edits, with no data lost.
4. Same-row conflict: both edit the same note's title offline. After reconnect both clients show the same title (last write by server time wins).
5. Soft delete: deleting a note on A removes it from B after sync. A client that was offline during the delete drops it on reconnect.
6. Outbox survives restart: kill the app with unsynced changes, reopen, and the changes still sync.
7. Row security: a second test user cannot read or change the first user's notes (SQL test).
8. Local writes show in the UI in under 100 ms (measured and printed).
9. Written verdict in `.context/decisions.md`: go, or no-go with the fallback (PowerSync) and why.

## Out of scope

- Real Tovy tables, screens, styling, login with Google, reminders, progress logic.
- Server-computed derived numbers (progress, streaks).
- Production Supabase project.

## Open questions

- Supabase dev project: you create it (Mumbai region) and give me the URL and anon key as environment secrets. I can't create it from here. Answer: pending.
- Proof on a real phone: the cloud session can't hold a phone, so criteria 2 to 6 are automated with two browser clients (one forced offline), and you repeat criteria 2 and 3 once on your phone in Expo Go. Agreed? Answer: pending.

## Plan

Files to touch, in order (all under a throwaway `spike/` folder, deleted or folded in after the verdict):

1. `spike/` Expo app with Expo Router, TypeScript. Check current Legend-State sync docs and Expo SDK version first.
2. `supabase/migrations/0001_notes.sql`: `notes` table (id uuid from client, user_id, title, updated_at set by server trigger, deleted_at) with row security on `auth.uid()`.
3. `supabase/tests/notes_rls.sql`: user A and B isolation (criterion 7).
4. `spike/src/sync.ts`: Legend-State store persisted to SQLite on phone and IndexedDB on web, with Supabase sync, retries and soft delete.
5. `spike/app/index.tsx`: the notes list with add, edit, delete and a small status line (synced, syncing, offline).
6. `spike/tests/sync.e2e.ts`: Playwright, two browser contexts, one set offline, covering criteria 2 to 6.
7. Timing: log tap to render time for local writes (criterion 8).
8. Verdict in `.context/decisions.md` (criterion 9).

Test per criterion: 1 manual plus Playwright smoke, 2 to 6 Playwright, 7 SQL test, 8 printed timing, 9 file review.

Risks:
- Legend-State's Supabase sync may not cover deletes or retries the way we need. If so, write a thin custom sync (criterion 6 and 5 are where this shows up). This is exactly what the spike is for.
- Playwright offline mode is not identical to a phone losing signal, hence the one real phone check.
- Expo Go limits: SQLite and the sync library need to work inside it. If not, move the spike to a dev build and record that.

## Progress

- [x] Supabase dev project created and keys added (human). Keys reach the session as `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_API_KEY`
- [x] Spike app scaffolded (builds for web, renders sign-in in Chromium, typecheck clean)
- [x] Migration and row security test (criterion 7 passes on a local Postgres with stubs; rerun on Supabase when reachable)
- [x] Sync layer (Legend-State syncedSupabase)
- [x] Notes screen
- [ ] Apply `supabase/migrations/0001_notes.sql` to the Supabase project (human, SQL editor). Table is missing: REST returns PGRST205. Blocks criteria 2 to 6
- [ ] End-to-end tests (run against Supabase: criterion 8 passes, worst 11.7 ms over 10 writes; 2 to 6 blocked by the missing table)
- [ ] Timing check
- [ ] Verdict written

## Notes

- Expo SDK is 57 (React Native 0.86). Routes live in `src/app/`.
- Legend-State: Supabase sync only exists in v3, which is still beta (`3.0.0-beta.48`; v2 latest is 2.1.15). Risk for the verdict.
- Legend-State v3 declares an optional peer `expo-sqlite ^15`, but SDK 57 ships expo-sqlite 57. Installed with `--legacy-peer-deps`. Phone persistence is untested until run in Expo Go.
- Soft delete: the plugin expects a boolean `deleted` column, not the plan's `deleted_at`. The spike uses `deleted boolean`. Decide for the real schema after the verdict.
- `select` is left off syncedSupabase because the typings need generated database types. Add them in phase 1.
- Spike uses fixed persist name `notes`. The real app must clear local data on sign out.
- Environment: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set from `SUPABASE_URL` and `SUPABASE_ANON_KEY` when building. The test user sign-up needs "Confirm email" turned off in Supabase Auth.
- Supabase is reachable now. The browser needs the sandbox proxy (`playwright.config.ts` sets it from `HTTPS_PROXY`). Test users are made through the admin API with `SUPABASE_API_KEY`, because Supabase rejects example.com emails.
- The notes screen shows `synced` even when the table does not exist, so a missing migration fails silently. Surface sync errors in the status line.
- Playwright `routeWebSocket` connects from Node and ignores the sandbox proxy, so offline is now simulated by wrapping `WebSocket` in the page. Unproven until the table exists.
- Lint not run: `expo lint` wants to install eslint and hits the same peer conflict. Fine for a throwaway spike.
