# Sorting tasks from the list

Status: in progress

Waiting on: the human trying it (built overnight).

## Problem

The Inbox exists to capture fast and sort later, but sorting meant opening each task. Todoist and Things let you schedule a task or file it in a project straight from the list. No database change.

## Acceptance criteria

1. The row menu (right-click on the web, long-press on a phone) offers Open, Schedule, Move to project, Move to tomorrow, Delete.
2. Schedule opens the schedule sheet for that task (typed dates, day chips, time chips); Move to project opens the project picker with Inbox first. Both save at once.
3. Moving shows "Moved to <project>" with Undo, which puts it back where it was. Moving to the project it is already in does nothing.
4. The task's own project chip says "Inbox" when it has none (the Projects list keeps its "No project" row, which the e2e test `t4` uses).

## Progress

- [x] `useTaskActions` holds the two sheets and the move with Undo; `ProjectPickerSheet` shows Inbox and project icons
- [x] Checked in a browser at 1440: right-click "Buy running shoes" in Inbox, Move to project, Health; the row left the Inbox, Health counted 3, the toast offered Undo
- [x] Checks: lint, format, typecheck, 82 unit tests, web export
- [ ] Human tries it
