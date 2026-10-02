# Tasks

Status: draft

Size: risky (new tables with row security, a migration, and removing the spike's `notes` table).

## Problem

Tovy only has the spike's notes list. Phase 2 of `.context/project-plan.md` makes it a task app: real tasks you can add, edit, finish and delete (with a short undo), subtasks, and optional projects with an Inbox for everything else. Everything must work offline and sync, as the notes already do. Today, quick add, progress, routines and the calendar come in later phases.

## Acceptance criteria

1. Adding a task from the task list shows it instantly (under 100 ms, measured like the existing timing test).
2. A task has a title, an optional note and an optional due date. Editing any of them shows instantly and syncs to the database.
3. A task can be marked done and not done.
4. Deleting a task hides it at once and shows an Undo for 5 seconds. Undo brings it back. After 5 seconds it stays deleted, and it disappears on the user's other devices after sync.
5. A task can have subtasks, one level deep only. A task shows how many subtasks it has. Deleting a task also hides its subtasks, and Undo brings them all back.
6. A user can create, rename and delete projects, and move a task to a project. Tasks with no project show under Inbox. Deleting a project moves its tasks to Inbox and deletes none of them.
7. Offline: with the network off on device A, add one task, edit another and delete a third. The list updates instantly. After the network returns, device B shows all three changes within 2 s.
8. Two devices edit different tasks offline: both edits survive after reconnect. Both edit the same task's title: after reconnect both show the same title (last write by server time wins).
9. Row security: another user cannot read or change a user's tasks or projects, and cannot put their own task into someone else's project or under someone else's task (SQL test in CI plus an e2e check).
10. The new tables come from a numbered migration that CI applies to dev on merge. After the tasks screen replaces the notes list, a later migration drops the `notes` table.
11. Signing out clears the local copy of tasks and projects, and the next user on the device sees none of them (the existing per-user store behavior).
12. The e2e suite is ported from notes to tasks, with the same behaviors covered, and passes. Lint, format check, typecheck, unit tests and the CI row security test pass.

## Out of scope

- Today screen, quick add with date parsing (Phase 3), calendar view (Phase 4).
- Partial progress, the progress log, deep versus quick tasks, routines, streaks, reminders, attachments, tags, priorities (Phases 5 to 8).
- The AI connection and approval inbox (Phase 6).
- Visual design. This spec uses a plain list. Colours, spacing and polish come with the `design-tokens` spec and Phase 10.
- Sharing tasks with other people.

## Open questions

- Fields for now: title, note, due date, done. Is that the right set? My recommendation is yes, because due date is needed by Today in Phase 3, and priorities and tags can wait. Answer: pending.
- The spike `notes` table: drop it at the end of this spec (after the tasks screen replaces the notes list)? My recommendation is yes, since it only holds test data. This deletes data in your database, so I will not do it without your answer. Answer: pending.
- Deleting a project: move its tasks to Inbox, or delete them too? My recommendation is Inbox, so nothing is lost by accident. Answer: pending.
- Subtasks one level deep, or unlimited nesting? My recommendation is one level, which matches the plan's "equal subtask weights" progress later and keeps the screen simple. Answer: pending.
- (proposed) Plain unstyled screen now, with styling later in `design-tokens`. Answer: pending.

## Plan (draft, to be firmed up after the answers)

Branch per slice group, `feat/tasks-...`. Each slice ends green and is ticked below.

1. **Tables and row security.** Migration `0003_tasks.sql`: `projects` (id, user_id, name, deleted, created_at, updated_at) and `tasks` (id, user_id, title, note, due_date, done_at, project_id null for Inbox, parent_id null for top level, deleted, created_at, updated_at), with the same server-set timestamps, the same row security pattern, and checks that `project_id` and `parent_id` belong to the same user. Extend `supabase/tests/` so user B cannot read or change user A's rows or link to them. Test: the SQL test passes and fails when a policy is weakened.
2. **Store.** Replace the notes store with one per-user store holding tasks and projects (same Legend-State plugin, soft delete via `deleted`, realtime and catch-up kept). Functions to add, edit, mark done, delete and restore (a task with its subtasks), create, rename and delete a project. Unit tests for these without the network.
3. **Task list screen.** Add, edit, done, delete with a 5 second Undo, plain layout. Port the timing check.
4. **Subtasks.** Add and show under a parent, count, delete and undo together.
5. **Projects and Inbox.** Project list, move a task, Inbox for no project, project delete moves tasks to Inbox.
6. **End to end.** Port the 14 e2e tests from notes to tasks, add tests for undo, subtasks, project delete and the cross-user link checks.
7. **Remove the spike.** Migration `0004` drops `notes`, delete the notes code, update docs and context.

Risks:
- Replacing the notes list breaks the existing e2e tests, which rely on notes element names. They move in the same slices as the screen so the suite is never left broken.
- Two tables synced at once (realtime and the catch-up from `decisions.md` per table) is new. A missed change between tables, such as a task arriving before its project, is a risk. I would test that case explicitly.
- Deleting a task with subtasks touches several rows. Each is a normal sync, but undo must restore all of them or none, so undo is tested together with a reload during the 5 second window.
- The `notes` drop is irreversible. It waits for your answer and runs last.

## Progress

- [ ] Questions answered
- [ ] Plan firmed up and approved (human)
- [ ] 1 Tables and row security
- [ ] 2 Store
- [ ] 3 Task list screen
- [ ] 4 Subtasks
- [ ] 5 Projects and Inbox
- [ ] 6 End to end
- [ ] 7 Remove the spike

## Notes

- Keep each slice small and run the e2e suite once per slice, not in loops, to keep the cost down.
- The current store lives in `src/core/sync/notes.ts` (per user, with `dispose()` and `catchUpAfterRealtime()`). The tasks store should keep those two behaviors.
