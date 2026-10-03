# Priorities, deadlines, labels and repeats

Status: in progress

Waiting on: the human tries it on the preview.

Size: risky (a migration on `tasks`, row security unchanged but checked).

## Problem

Stage 3 of `foundation-reset.md` lists priorities, labels, deadlines and repeats. They need new columns, which is why they were not built overnight: the app writes whole rows, so if the app ships a field before the migration has reached the database the preview points at, every save of a task fails. This spec plans the order so that cannot happen.

## Acceptance criteria

1. Priority 1 to 4 (4 is none). P1 shows as a 2 px black ring and a mono `P1` tag on the row (style guide), P2 and P3 as the tag only. Quick add reads `p1` to `p3`. Lists sort by priority inside each section, then by the current order.
2. Deadline: a date the task must be done by, separate from when you plan to do it (the due date). Shows as "Deadline Fri 9 Oct" in the meta line, red within two days.
3. Labels: free words, many per task, shown in the meta line; quick add reads `@word`. A Labels page lists them with counts.
4. Repeat: daily, weekdays, weekly on chosen days, monthly on the date, every N days. Finishing a repeating task moves it to the next date instead of closing it (and logs the finish). Quick add reads "every day", "every monday", "every 3 days".
5. The migration adds the columns with defaults, so old app versions keep working: `priority smallint not null default 4 check (priority between 1 and 4)`, `deadline date`, `labels text[] not null default '{}'`, `repeat jsonb`.
6. Order of shipping: the migration merges to main and reaches dev first (its own small PR). Only then does the app start sending the new fields. The app reads them defensively (missing means default) so a device that syncs older rows is fine.
7. Row security test in `supabase/tests/tasks_rls.sql` still passes; unit tests for parsing (`p1`, `@label`, "every ..."), sorting and the next repeat date; e2e for adding with `p1 @home every monday` and finishing it once.

## Open questions

- Should P1 to P3 get any colour? The style guide says black and white with red only for overdue and delete. Proposed: no colour, ring weight and the tag only.
- Repeats from the due date or from the day it was finished (Todoist has both, "every" and "every!")? Proposed: from the due date, and "after N days" counts from the finish.

## Plan

1. PR A: migration `0011_task_fields.sql` only (0009 and 0010 are `mcp-server`), plus the RLS test. Merge, let CI apply it to dev.
2. PR B: store and sync (`tasks.ts` types, `addTask`, `editTask`, `setDone` repeat logic) with tests.
3. PR C: UI: row tags, detail chips and sheets (priority, deadline, labels, repeat), quick add words, Labels page.

## Progress

- [x] Approved by the human (2026-10-03, "go do every one"), with the proposed answers: no colour for priorities; repeats count from the due date
- [x] PR A: migration 0011 and its row security checks (defaults, priority range, repeat must be an object)
- [x] PR B and C together (the migration was live on dev first): store fields and repeat finishing (moves to the next date, logs the finish, Undo puts the date back), quick add words (p1 to p3, @label, every ...), Paper's P1 ring and P tags, deadline in red within two days, labels and a repeat mark on rows, priority first in every list, detail chips with menus and sheets, a Labels page (sidebar and Browse); checked in Chromium
- [ ] Later: the MCP tools do not set these fields yet, and complete_task does not repeat (it closes the task)
- [ ] e2e for `p1 @home every monday` once the suite runs again
