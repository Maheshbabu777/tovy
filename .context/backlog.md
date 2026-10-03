# Backlog

Things agreed to do later. Each becomes a spec in `specs/` when its turn comes. Newest at the bottom of each list. When an item is done or dropped, delete it here and note it in its spec.

## Left over from stage 1 (`specs/foundation-reset.md`)

- The human checks the Vercel preview (https://tovy-git-feat-foundation-reset-maheshbabu777s-projects.vercel.app) himself: every signed-in screen (Inbox, Today, Upcoming, Browse, Projects, a project, task detail, Profile, Appearance, and `/gallery`) at phone and wide width in light and dark next to the Paper file, and reports what differs.
- Run the e2e suite with the Supabase secrets (`h1`, `t2`, `d1`, `t4` and the dark background check were edited without a run; `i1` was removed with the approval screen).
- Project colours: every project shows grey for now (`PROJECT_COLORS` in `src/ui/theme.tsx`). Decide in the information architecture stage whether projects keep any colour.
- Local shell on the human's Windows machine cannot finish `npm ci` in one run; checks run in a cloud copy. Worth a note in `project.md` Gotchas if it keeps happening.

## Waiting on the human (from the night of 2026-10-03)

- Push the branch, then check on a real phone: swipe rows, the task sheet drag, the keyboard over quick add and sign in, long-press action sheet (specs `mobile-screens`, `first-run`).
- Approve `specs/task-fields.md` (priorities, deadlines, labels, repeats). It needs a migration that must reach the database before the app sends the new fields; the spec sets the order.
- Approve or adjust the overnight specs, all `in review`: `design-polish`, `mobile-screens`, `quick-add-words`, `first-run`, `task-schedule`, `keyboard-lists`.
- A Google mark on "Continue with Google" needs the official asset.
- AI apps (`specs/mcp-server.md`, in review): merge so migration 0009 reaches dev, then the dashboard steps (OAuth server on, path `/oauth/consent`, dynamic registration, asymmetric keys), deploy the `mcp` function, check security finding S5 with a real token, and connect Claude once.

## Later stages (order from the spec)

- Stage 2 leftovers: drop the proposals table in a migration once every device runs without its sync (`specs/drop-proposals-sync.md` removed the app side). Search and Filters and labels in the sidebar once they exist.
- Stage 3, tasks: sections in projects (priorities, labels, deadlines and repeats are in, `specs/task-fields.md`). Done overnight: quick add that reads words, overdue Reschedule, the Completed list, times on a task.
- Stage 4, Upcoming: reorder tasks within a day (needs a sort order column). Drag to a day or list is done (`specs/upcoming-drag.md`).
- Stage 5, motion and gestures: haptics are in (expo-haptics: finishing, swipe point, long press, the ID card, deleting, picking a day). Left: moving the PanResponder swipe and sheet drag to Reanimated and Gesture Handler if they feel slow on a phone (checked in Expo Go).
- Stage 7 leftovers (`specs/mcp-server.md` built the rest): purge Trash after 30 days with pg_cron, elicitation for deletes once the transport keeps sessions, `check_in_routine` and `add_reminder` tools with their phases.

## Ideas from the human

None open. The ID card became `specs/motion-and-id-card.md`.
