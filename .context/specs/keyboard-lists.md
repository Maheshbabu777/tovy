# Keyboard through lists on the web

Status: in progress

Waiting on: the human trying it (built overnight).

## Problem

On the web, a task list could only be worked with the mouse. People who live in Todoist or Linear expect to move through a list and finish tasks from the keyboard, and to find the shortcuts in one place.

## Acceptance criteria

1. J or Down focuses the next task in whatever list is showing, K or Up the one before; the focused row lights up with a bar at its left edge; the list scrolls to keep it in view.
2. X finishes or reopens the focused task and focus stays at the same place in the list; Enter opens it.
3. ? opens a sheet with every shortcut; N focuses the composer (or opens quick add), Q always opens the quick add sheet.
4. Keys are ignored while typing in a field; nothing changes on a phone.

## Progress

- [x] `src/ui/keyboardList.ts` (reads the rows in page order, so no screen has to take part), `ShortcutsSheet.tsx`, keys wired in the Shell, the row's keyboard focus shown as a lit row with a left bar
- [x] Checked in a browser at 1440: J twice focused the second row, X moved it to Done today, ? opened the sheet
- [x] Checks: lint, format, typecheck, 80 unit tests, web export
- [ ] Human tries it
