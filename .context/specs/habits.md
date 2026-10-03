# Habits

Status: in progress

Waiting on: the human tries it on the preview.

## Problem

Stage 6 of the plan: habits with their own streaks, skip and pause, and a heatmap. Paper (02 Components) draws a habit row as a soft square with "Daily · 12 days in a row".

## Acceptance criteria

1. A repeating task can be tracked as a habit (Repeat menu, "Track as a habit"). No migration: the flags live in `repeat` (`habit`, `paused`).
2. A habit row has the square check and "Daily · 8 days in a row" (the streak from two in a row).
3. Finishing a habit moves it to its next day and logs it (task-fields); Skip moves it on and logs a skip for the day it was due, which keeps the streak; Pause takes it off Today, Upcoming, Inbox and the counts until it is resumed (resuming brings it to today).
4. Streak: due days in a row kept (done or skipped), counted back from today; today does not break it while it is still to do. Best: the longest run in two years.
5. Habits page (sidebar, Browse): each habit with streak, best, twelve weeks of days (done filled, skipped ringed, missed grey, today ringed while open), Skip and Pause or Resume. The same card shows in the habit's detail.

## Out of scope

- Reminders and notifications for habits.

## Progress

- [x] Built: `src/core/habits.ts` (due days, streaks, heatmap) with tests, store `skipHabit`, `setHabit`, `setPaused` with tests, rows, Habits page, detail card; checked in Chromium
- [ ] Human: try a habit for a few days
