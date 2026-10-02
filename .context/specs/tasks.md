# Tasks

Status: approved

Size: risky (new tables with row security, a migration, and removing the spike's `notes` table).

## Problem

Tovy only has the spike's notes list. Phase 2 of `.context/project-plan.md` makes it a task app: real tasks you can add, edit, finish and delete (with a short undo), subtasks, and optional projects, with tasks that have no project shown under "No project". The Figma prototype (`.context/design-notes.md`) shaped several details below. Everything must work offline and sync, as the notes already do. Today, quick add, progress, routines and the calendar come in later phases.

## Acceptance criteria

1. Adding a task from the task list shows it instantly (under 100 ms, measured like the existing timing test).
2. A task has a title, an optional note, an optional due date with an optional time of day, and a kind: quick (the default) or deep. Editing any of them shows instantly and syncs to the database.
3. A task can be marked done and not done.
4. Deleting a task hides it at once and shows an Undo for 5 seconds. Undo brings it back. After 5 seconds it stays deleted, and it disappears on the user's other devices after sync.
5. Only a deep task can have subtasks, and subtasks can have their own subtasks with no fixed limit on depth, as long as each parent is deep. A deep task with subtasks cannot be switched back to quick. A task shows how many direct subtasks it has. Deleting a task also hides everything beneath it at every depth, and Undo brings them all back.
6. A task can never end up under itself or under one of its own subtasks, and a quick task can never be a parent. The database refuses such changes, and the app does not offer them.
7. A user can create, rename and delete projects, give a project a colour, and move a task to a project. Tasks with no project show under "No project". Deleting a project moves its tasks to "No project" and deletes none of them.
8. Offline: with the network off on device A, add one task, edit another and delete a third. The list updates instantly. After the network returns, device B shows all three changes within 2 s.
9. Two devices edit different tasks offline: both edits survive after reconnect. Both edit the same task's title: after reconnect both show the same title (last write by server time wins).
10. Row security: another user cannot read or change a user's tasks or projects, and cannot put their own task into someone else's project or under someone else's task (SQL test in CI plus an e2e check).
11. The new tables come from a numbered migration that CI applies to dev on merge. After the tasks screen replaces the notes list, a later migration drops the `notes` table.
12. Signing out clears the local copy of tasks and projects, and the next user on the device sees none of them (the existing per-user store behavior).
13. The e2e suite is ported from notes to tasks, with the same behaviors covered, and passes. Lint, format check, typecheck, unit tests and the CI row security test pass.

## Out of scope

- Today screen, quick add with date parsing (Phase 3), calendar view (Phase 4).
- Partial progress, the progress log, deep versus quick tasks, routines, streaks, reminders, attachments, tags, priorities (Phases 5 to 8).
- The AI connection and approval inbox (Phase 6).
- Per routine streaks, the Search screen and the AI source chip on tasks (seen in the design, see `.context/design-notes.md`, decided in later phases).
- Dark theme, motion and full polish (`design-tokens` spec and Phase 10). The screens in this spec do copy the look of the Figma prototype (colours, type, card shape, check circles, project dots), light theme only.
- Sharing tasks with other people.

## Open questions

- Fields for now: title, note, due date, done. Answer: yes (2026-10-02).
- The spike `notes` table: drop it at the end of this spec, after the tasks screen replaces the notes list? Answer: yes, drop it last (2026-10-02). This deletes data in the database and cannot be undone, so it is the final slice.
- Deleting a project: move its tasks to "No project" (first called Inbox when asked), or delete them too? Answer: move them to "No project" (2026-10-02).
- Subtasks one level deep, or unlimited nesting? Answer: unlimited nesting (2026-10-02), against my recommendation of one level. That is why criteria 5 and 6 changed: depth is unbounded, a task can never end up under itself, and delete and undo cover every descendant.
- Quick versus deep tasks (from the design): add a `kind` now, subtasks only on deep tasks? Answer: yes (2026-10-02).
- Name for tasks with no project, since the design uses Inbox for the AI approval inbox? Answer: "No project" (2026-10-02).
- Due time and project colour (both in the design)? Answer: include both now (2026-10-02).
- Plain screen now or copy the Figma look? Answer: copy the look of the prototype for the screens in this spec, with the logo in `assets/brand/` (2026-10-02: "replicate that reference i gave you for ui"). Values live in `src/ui/tokens.ts`.

## Plan

Branch per slice group, `feat/tasks-...`. Each slice ends green and is ticked below.

1. **Tables and row security.** Migration `0003_tasks.sql`: `projects` (id, user_id, name, color, deleted, created_at, updated_at) and `tasks` (id, user_id, title, note, due_date, due_time, kind quick or deep, done_at, project_id null for "No project", parent_id null for top level, deleted, created_at, updated_at), with the same server-set timestamps, the same row security pattern, and checks that `project_id` and `parent_id` belong to the same user. Extend `supabase/tests/` so user B cannot read or change user A's rows or link to them. Test: the SQL test passes and fails when a policy is weakened.
2. **Store.** Replace the notes store with one per-user store holding tasks and projects (same Legend-State plugin, soft delete via `deleted`, realtime and catch-up kept). Functions to add, edit, mark done, delete and restore (a task with its subtasks), create, rename and delete a project. Unit tests for these without the network.
3. **Task list screen.** Add, edit, done, delete with a 5 second Undo, in the look of the prototype with the logo. Port the timing check.
4. **Subtasks and kind.** Switch a task between quick and deep, add and show subtasks under a deep parent at any depth (indented tree), direct subtask count, no moves that create a cycle, delete and undo together for every descendant.
5. **Projects and "No project".** Project list with colour, move a task, "No project" for tasks without one, project delete moves tasks to "No project".
6. **End to end.** Port the 14 e2e tests from notes to tasks, add tests for undo, subtasks, project delete and the cross-user link checks.
7. **Remove the spike.** Migration `0004` drops `notes`, delete the notes code, update docs and context.

Risks:
- Unlimited nesting: a cycle (A under B under A) would hide tasks forever and break delete. The database trigger and the app both refuse it, tested in slice 1 and slice 4. Very deep chains make the screen and the "walk up" check slower, so I will test a chain of 50. If it is a problem, a depth cap is the fix and I will ask first.
- Later progress (Phase 5) with equal subtask weights needs a rule for nested levels. It does not block this spec, but it is a design question to settle then.
- Replacing the notes list breaks the existing e2e tests, which rely on notes element names. They move in the same slices as the screen so the suite is never left broken.
- Two tables synced at once (realtime and the catch-up from `decisions.md` per table) is new. A missed change between tables, such as a task arriving before its project, is a risk. I would test that case explicitly.
- Deleting a task with subtasks touches several rows. Each is a normal sync, but undo must restore all of them or none, so undo is tested together with a reload during the 5 second window.
- The `notes` drop is irreversible. It waits for your answer and runs last.

## Progress

- [x] Questions answered (2026-10-02)
- [x] Plan approved (human, 2026-10-02: "go ahead")
- [x] 1 Tables and row security
- [x] 2 Store
- [x] 3 Task list screen
- [ ] 4 Subtasks
- [ ] 5 Projects and No project
- [ ] 6 End to end
- [ ] 7 Remove the spike

## Evidence

Slice 1 (criteria 6, 10 and the table part of 11), branch `feat/tasks-tables`:

- `supabase/migrations/0003_tasks.sql` adds `projects` and `tasks` with row security (select, insert and update by owner, no delete policy), server set timestamps, a security definer trigger `check_task_links`, and realtime. `supabase/tests/tasks_rls.sql` is now run by `supabase/tests/run.sh`.
- `bash supabase/tests/run.sh`: `PASS: tasks and projects are isolated and their rules hold` (exit 0), after the existing notes test.
- Covered by the test: a subtask under a quick task is refused, a task cannot be its own parent, a task cannot move under its own descendant, a deep task with live subtasks cannot become quick, a due time needs a due date, an unknown kind is refused; user B sees none of A's rows, cannot update, delete or forge them, cannot link a task to A's project or put one under A's task; neither user can hard delete.
- Mutation checks (each applied alone to the migration, then restored): cycle check removed gave `FAIL: a cycle was created`; quick parent allowed gave `FAIL: a subtask was added under a quick task`; project link unchecked gave `FAIL: user B linked a task to A's project`; select policy opened to everyone gave `FAIL: user B saw 4 of A's tasks`.
- Checked on the real dev project after merge: CI applied `0003` (both tables answer HTTP 200). Through the API with two temporary users (deleted afterwards, 1 user left): 13 of 13 checks passed. A, a deep task with due date and time, a quick task and a subtask are accepted (201). A subtask under a quick task, a move under its own subtask, a deep task with a live subtask becoming quick and a due time without a date are refused (400). B sees 0 of A's tasks (200, empty), cannot link a task to A's project or put one under A's task (403). Signed out sees nothing (200, empty) and cannot write (401).

Slice 2 (store), branch `feat/tasks-store`:

- `src/core/sync/tasks.ts`: `createTasksStore(userId)` holds tasks and projects (one persisted store each, per user), with add, edit, done, kind, move to project, move under a parent, delete with everything beneath it and an `undo`, and project add, rename, colour and delete (its tasks move to "No project"). The rules mirror the database trigger, so a wrong action fails at once on the device. It keeps `dispose()` and the catch-up after realtime for both tables. The shared sync configuration moved to `src/core/sync/syncConfig.ts` and `notes.ts` uses it.
- 9 new unit tests, 12 in total, all passing. They include a chain 50 levels deep (the plan's risk), cycle refusal at any depth, delete and undo of a three level tree, and project delete keeping tasks. Four deliberate breakages (cycle check removed, quick parent allowed, undo restoring nothing, project delete deleting tasks) each failed exactly one test, and the file was restored.
- `npm run test:e2e`: 14 passed (the notes tests, unchanged), and the project had 1 user afterwards. Lint, format check and typecheck pass.
- Not proven: sync of the tasks store against Supabase (that needs the screen and the ported e2e tests, slices 3 and 6), and the 5 second undo timing (a screen concern, slice 3).

Slice 3 (task list screen), branch `feat/tasks-screen`:

- `src/ui/TasksScreen.tsx` replaces the notes screen: add bar, card with rows (round check, title, due date, delete), an editor per row (title, note, due date, due time), a 5 second Undo bar, the sync status, and sign out with the unsynced-changes warning. `app/index.tsx` now creates `createTasksStore` per user (same lifecycle, disposed at sign out) and the sign-in screen uses the logo and tokens. Logo files are in `assets/brand/`.
- `src/ui/tokens.ts`: colours, radii, fonts and the five project colours from the prototype. Values I could not read from the prototype (add bar, chip, section label) are estimates from screenshots.
- e2e: the 14 notes tests now drive tasks (helpers `titles`, `renameTask`, and the server read uses `tasks`). Tests 7 and 7b still check the `notes` table until slice 7. New test `t1`: Undo restores a task, and the Undo bar disappears after 5 seconds with the task still deleted on the server. `npm run test:e2e`: 15 passed. Worst local write render 16.2 ms (limit 100). Lint, format check, typecheck pass.
- Not checked: the screen was not looked at in a browser or on a phone, only driven by tests. Subtasks, kind and projects have no UI yet (slices 4 and 5).

## Notes

- The Figma prototype (`.context/design-notes.md`) is reference only. Where it disagrees with this spec, this spec wins. The four details taken from it (kind, "No project", due time, project colour) are in because the human chose them.

- Keep each slice small and run the e2e suite once per slice, not in loops, to keep the cost down.
- The current store lives in `src/core/sync/notes.ts` (per user, with `dispose()` and `catchUpAfterRealtime()`). The tasks store should keep those two behaviors.
