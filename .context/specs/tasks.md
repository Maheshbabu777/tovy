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
- [x] 4 Subtasks
- [x] 5 Projects and No project
- [ ] 6 End to end (tests moved, t2 intermittent, see evidence)
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

Slice 4 (subtasks and kind), branch `feat/tasks-subtasks`:

- `src/ui/TasksScreen.tsx`: rows are a tree. Each task shows its subtasks indented beneath it at any depth, a "Deep" badge, and its direct subtask count ("1 subtask"). The editor has a quick/deep switch and, for a deep task, an "Add a subtask" field. Store rules (cycle, quick parent, deep with subtasks stays deep) show as an error line. Delete hides the task and everything beneath it, and one Undo brings all of them back ("3 tasks deleted").
- Found by the new e2e tests, and fixed in `src/core/sync/tasks.ts` (the plugin's create call): (1) a subtask added in the same offline session as its parent was sent at the same time and refused by the database (parent not there yet), so it never reached the server. Now a refusal that says the parent or project does not exist, or that the parent is not deep yet, is retried for a few seconds. (2) A task changed while its first insert was still in flight was sent as a second insert, got a duplicate key error and stayed pending forever, and in one case a deleted task came back on screen. Now a repeat insert of a row the server has is saved as an upsert. Both races were reproduced (request log showed the 403, 409 and 400 refusals) and gone after the fix.
- e2e: `t2` (nest three levels, direct count, deep stays deep with an error, delete and Undo cover all three, and after the Undo expires all three are deleted on the server), `t3` (parent and subtask added offline both reach the server after reconnect). `npm run test:e2e`: 17 passed (the suite plus t1, t2, t3), worst local write 16.4 ms. 12 unit tests, lint, format check and typecheck pass.
- Not proven: the retry gives up after about 14 seconds (8 tries) if a parent never saves, then the change stays pending. A slow network with many levels created at once is untested. The screen was not looked at by eye.

Slice 5 (projects and "No project"), branch `feat/tasks-projects`:

- `src/ui/TasksScreen.tsx`: tasks are grouped in a card per project plus a "No project" card (shown when it has tasks, or when there are no projects). Each project header has its colour dot (tap to cycle the five colours), an editable name, a task count and delete (its tasks move to "No project", none are deleted). A "New project" bar adds projects. The task editor has a chip row to move a task to a project or back to "No project". Subtasks stay under their parent. The sync status and the sign-out warning now count unsynced project edits too.
- e2e `t4`: create a project, a task starts under "No project", move it into the project (the server row holds the project id), delete the project: the task shows under "No project" and the server holds `project_id` null and no live project. `npm run test:e2e`: 18 passed, worst local write 12.6 ms. Lint, format check and typecheck pass.
- Found: gating the "loading" label on the projects store's `isPersistLoaded` left every screen on "loading" (it does not become true here), so only the tasks store gates it. Not looked into further.
- Not proven: project rename and colour change sync (only add and delete are checked by e2e, the store unit test covers rename and colour); a task moved to a project created in the same offline session (the create retry covers it in theory, not tested); the screen was not looked at by eye.

Slice 6 (end to end), branch `test/tasks-cross-user-e2e`:

- Across slices 3 to 5 the 14 notes tests moved to tasks and new tests were added (`t1` Undo, `t2` subtasks and delete cascade, `t3` offline parent and subtask, `t4` projects). This slice moves the last two, 7 and 7b, from `notes` to tasks and projects. Test 7: a second user cannot read, change, forge, hard delete, put a task into the owner's project or put one under the owner's task (403 for both link attempts). Test 7b: a signed-out visitor cannot read, write, change or delete tasks or projects.
- Tests 7 and 7b pass, and no test refers to the `notes` table any more, so slice 7 can drop it.
- Not green every time: in 4 full runs on this branch `t2` (subtasks, delete and Undo) failed 3 times and passed once, and passed alone each time. The failures differed: the Undo bar still showing after 7 s, and the sync status staying "pending 1". These runs were also slower than the earlier ones (up to 2.1 minutes against 1.3). It passed in three full runs in slice 4 and 5. Not root-caused. It looks like the same family as the two sync races fixed in slice 4 (a change to a task while its insert is in flight), so a third case may remain. CI does not run e2e, so CI cannot show this. Needs a decision, see the PR.

## Notes

- The Figma prototype (`.context/design-notes.md`) is reference only. Where it disagrees with this spec, this spec wins. The four details taken from it (kind, "No project", due time, project colour) are in because the human chose them.

- Keep each slice small and run the e2e suite once per slice, not in loops, to keep the cost down.
- The current store lives in `src/core/sync/notes.ts` (per user, with `dispose()` and `catchUpAfterRealtime()`). The tasks store should keep those two behaviors.
