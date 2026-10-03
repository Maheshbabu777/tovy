# Drag a task to another day or list

Status: in progress

Waiting on: the human trying it in a browser (built overnight).

## Problem

Stage 4 of `foundation-reset.md`: in Upcoming you could only change a task's day by opening it or through the menu. Todoist and Things let you drag a task onto a day, and onto a project in the sidebar. No database change.

## Acceptance criteria

1. On the web, any task row can be dragged (the browser's own drag and drop; a click still opens the task).
2. Dropping on a day's section in Upcoming, or on its cell in the week strip, gives the task that date and keeps its time. While a task is held over it, a section is outlined and a cell fills like the picked day.
3. Dropping on Inbox, Today or a project in the sidebar moves the task there (Inbox: no project; Today: today's date). The item is outlined while a task is held over it.
4. Each drop says where the task went, with Undo. A finished task stays put ("A finished task stays where it is"); a subtask is not moved to another project on its own ("A subtask moves with its task"). Dropping where it already is does nothing.
5. A phone is unchanged: swipe, the row menu and Schedule do this there (a long press already opens the menu, and a drag would fight the scroll).

## Out of scope

- Reordering tasks within a day (needs a sort order column: a later spec with the task fields).
- Dragging on a phone or with a touch screen in a browser.

## Plan

`src/ui/dragTask.ts` (draggable rows and drop places on DOM drag events), `src/ui/useDropActions.ts` (what a drop does, with Undo), `TaskRow.tsx` (rows draggable), `UpcomingScreen.tsx` (day sections and week cells take drops), `Shell.tsx` (Inbox, Today and projects in the sidebar take drops).

## Progress

- [x] Built; checked in Chromium at 1440 with a stubbed Supabase: "Book dentist" dropped on Mon 5 Oct moved there (section outlined while held), then on Studio in the sidebar; "Review pull requests" dropped on Thursday's cell moved there (cell filled while held)
- [x] Checks: lint, format, typecheck, 90 unit tests, web export
- [ ] Human tries it
