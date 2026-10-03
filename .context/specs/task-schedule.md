# Task schedule and the completed list

Status: in review

## Problem

Two gaps found while planning the screens: a task's time of day could only be set by typing words in quick add (the task's date sheet had dates only), and a finished task vanished from everywhere except its project the day after (Today shows only today's done tasks). No database change: `due_time` and `done_at` already exist.

## Acceptance criteria

1. The task's date sheet ("Schedule") has a field that reads words ("fri 5pm", "12 oct", "in 3 days") with a live line saying what it read, Enter sets it; the next seven days and "No date" as chips; times as chips (Morning 9 AM, Noon, Afternoon 3 PM, Evening 6 PM, Night 8 PM, No time), shown only once a date is set. Each tap saves at once.
2. A Completed page lists finished top level tasks grouped by the day they were finished (Today, Yesterday, then dates), newest first, for 30 days; tapping the check reopens a task. It is in the web sidebar and in Browse on a phone (pushed page with back).
3. Unit test for the grouping; lint, format, typecheck, unit tests, web export pass; screenshots.

## Out of scope

- Repeats and reminders (need new columns and notifications).
- Older history than 30 days (the data is kept; a "load more" can come later).

## Progress

- [x] Schedule sheet (`DateSheet.tsx`), task detail passes and saves the time
- [x] `completedByDay` + test, `CompletedScreen.tsx`, route `/completed`, sidebar item, Browse row
- [x] Checks: lint, format, typecheck, 80 unit tests, web export
- [x] Screenshots: Completed at 1440; the sheet with "fri 4pm" typed, and after Enter the task moved to Coming up as "Fri 9 Oct, 4 PM"; the phone sheet in dark
- [ ] Human checks on the preview
