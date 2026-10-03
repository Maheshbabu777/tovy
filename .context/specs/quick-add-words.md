# Quick add that reads dates, times and projects

Status: in review

## Problem

Stage 3 of `foundation-reset.md` starts with quick add that understands words, the part of Todoist people miss most when it is gone. Typing "Call mum tomorrow 5pm #Home" should give a task "Call mum" due tomorrow at 5 PM in Home, without touching a date picker. It must work in every place a task is typed: the quick add sheet, the Today and Inbox composer, and the command palette. No database change: the fields (due date, due time, project) already exist.

## Acceptance criteria

1. Days: today, tod, tonight (8 PM unless a time is given), tomorrow, tmr, tmrw, weekday names and three letter forms (the next one, never today), next <weekday>, next week (next Monday), in N days, in N weeks, dates as "5 oct", "oct 5th", "5 october 2027", "5/10" (day first), rolling to next year when the date has passed.
2. Times: 5pm, 5:30 pm, 17:00, at 5 (1 to 6 afternoon, 7 to 11 morning), noon, midnight. A time with no day means today if it is still ahead, else tomorrow.
3. Projects: #Name matches an existing project, case and spaces optional, the shortest name that starts with the typed text wins; an unknown #word stays in the title.
4. Only whole words are read; one of each kind (the first typed); the read words leave the title; a task never ends up without a title (if everything was a date, the text stays as typed and nothing is read).
5. While typing, what was read shows next to the field (composer) or under it (sheet), and the toast after adding says where the task went ("Added "Call mum" · Tomorrow, 5 PM · Home").
6. In the sheet, tapping a date or project chip overrides what the words said.
7. Unit tests cover every rule above; lint, format, typecheck and the web export pass; the e2e titles used by the suite are not read as dates.

## Out of scope

- Repeats ("every monday"), priorities (p1 to p4), labels, deadlines: they need new columns, so they get their own spec and a migration (`task-fields.md`).
- Underlining the read words inside the field (a plain React Native text field cannot style part of its text).

## Plan

`src/core/parseTask.ts` (+ tests), then the sheet, the composer, the palette, the toasts.

## Progress

- [x] Spec written under the human's standing instruction for the night (2026-10-03)
- [x] Parser with 15 tests (`src/core/parseTask.test.ts`)
- [x] Quick add sheet: reads as you type, a line under the field, chips override
- [x] Today and Inbox composer: reads as you type, shows what it read at the right
- [x] Command palette: "Add task" reads the words too
- [x] Toasts say where the task went
- [x] Checks: lint, format, typecheck, 79 unit tests, web export; screenshots of the composer before and after Enter (the task landed in Coming up, Tomorrow 5 PM, in Launch) and of the phone sheet with "Dentist fri at 4 #health"
- [ ] Human tries it on the preview

## Notes

- The e2e titles (`perf-0`, `doomed-5`, `x3` and the rest) contain no word the parser reads: numbers only count with am, pm, a colon, a month or "at".
