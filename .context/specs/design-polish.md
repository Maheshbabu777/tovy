# Design polish: motion, navigation and character

Status: in progress

Waiting on: the human trying it (built overnight).

## Problem

The black and white redesign (`foundation-reset.md`) works but feels generic and static: screens look like a plain list, nothing moves when you navigate or finish a task, and some things do not line up (the back arrow and title in Profile pages). The human's Figma Make prototype (`C:\Users\mahes\Downloads\tovy-design`, the original design the app was built from) has the character and flow he wants. Take its layout ideas, navigation and motion, and draw them in the black and white Paper system. No indigo, no points.

## Acceptance criteria

1. **Today has a personal header.** The date line (mono, text-2) over a greeting for the time of day with the first name ("Up late", "Good morning", "Good afternoon", "Good evening", "Winding down"), with header buttons on the right: search (opens the palette), Upcoming, and on the phone the profile avatar. Under it a one line day summary in text-2 ("2 overdue · 3 due today · 1 done"), not a points ring.
2. **Composer at the top of lists (web).** A bordered quick bar at the top of Today and Inbox: plus, "Add a task", a hint example, and the `N` key cap. Phone keeps the add button.
3. **Command palette (web, Ctrl or Cmd K, and the search button).** Go to Inbox, Today, Upcoming, any project, Profile; add a task with the typed text; toggle dark mode; search tasks by title and open one. Arrow keys and Enter, key hints in mono, opens with the pop motion.
4. **Upcoming week strip.** Seven day cells (weekday, date, a dot per day with tasks, today ringed in black); pressing a day scrolls to it. Phone and web.
5. **Motion, one curve `cubic-bezier(0.2,0.8,0.2,1)`, no bounce:**
   - route change: fade plus 8 px rise, 180 ms;
   - task panel (web) slides in from the right, 220 ms; task detail on the phone pushes in from the right;
   - sheets rise 24 px and fade, 250 ms; menus and the palette pop from 0.96, 120 to 160 ms;
   - finishing a task: the row lands in its new place (Done) and its filled check pops (0.6 to 1.15 to 1, 300 ms). The store write is not delayed, so local writes stay under 100 ms (e2e test 8);
   - list rows fade and rise in with a small stagger on first load only;
   - the selected item in the sidebar and the phone tab bar moves with a sliding highlight;
   - toast slides up; its drain bar stays;
   - Reduce Motion (system setting) shows end states at once.
6. **Alignment.** One left edge per list: section headers, rows, add rows and empty states share the 32 px check column. Header buttons sit level with the first line of the title on every screen. Sidebar items, counts and key caps line up in one column. Checked in light and dark at 390 and 1440 wide.
7. **Profile and task detail with structure.** Profile: a header block (avatar, name, email, Google linked), groups with hairline boxes, a sync row with its state. Task detail: chips row (date, project), the progress card, subtasks and a timeline log with dots on a line, in the prototype's order.
8. Store calls and test ids unchanged; lint, format, typecheck, unit tests pass; e2e helpers updated only where a test id moved.

## Out of scope

- Points, rings for the day, streak screen, heatmap, freezes (no points on screen).
- Calendar month grid, drag to reschedule (stage 4).
- Natural language parsing in quick add (stage 3); the hint text only shows an example.
- Connected apps, activity feed, prompt kit, onboarding (their own stages).
- Reanimated and Gesture Handler (stage 5). Motion here uses React Native `Animated`, which works on web and phone.

## Open questions

- Greeting by name and time of day on Today, or keep the plain "Today" title? Answer: a message that fits the time of day with the first name (human, 2026-10-03).
- Celebration burst when the day is cleared? Answer: no (human, 2026-10-03). Dropped from criterion 5.
- How closely to follow the prototype? Answer: do not copy its placement; fit the ideas into Tovy's own layout, and every new part must work against the real data and store, not demo data (human, 2026-10-03).

## Plan

1. `src/ui/motion.ts`: shared timings, `useReducedMotion`, `useEnter` (fade and rise), `usePop`, `useSlideIn`.
2. Shell: route transition, sliding nav highlight, task panel slide, palette host.
3. `CommandPalette.tsx` (web) and its unit tests for matching.
4. Today header, day summary (`core/views.ts` + test), composer; Inbox composer.
5. Upcoming week strip.
6. TaskRow finish motion; list enter stagger.
7. Sheet, ContextMenu, Toast motion; alignment pass on every screen; Profile and TaskDetail structure.
8. Checks, gallery updated with the new parts, commit, preview check by the human.

Risks: `Animated` on web is fine for opacity and transform, but layout changes (a row leaving) cannot animate height without Reanimated, so a finished row fades and then moves. Keep test ids.

## Progress

- [x] Spec approved (human, 2026-10-03: "Build thing but don't copy paste ... backend also have to work")
- [x] Motion helpers (`src/ui/motion.ts`, `components/Enter.tsx`): route fade and rise, task panel slide, sheet rise, menu and palette pop, toast, row enter with a first-load stagger, check pop; Reduce Motion respected
- [x] Sidebar: Search row with the palette key, one sliding highlight behind the selected item; phone tab bar with a sliding top bar; phone top bar with search
- [x] Command palette (`CommandPalette.tsx`, `core/palette.ts` + tests): places, projects, tasks by title (open ones first), theme switch, add the typed text to Inbox. All real store data
- [x] Today header (`core/views.ts` `timelyGreeting`, `daySummary` + tests), first name from the saved profile (`useProfile.ts`, refreshed after an edit), wide composer that N focuses; Inbox composer
- [x] Upcoming week strip (`weekStrip` + test) that scrolls to the day
- [x] Alignment: row, section and add-row hairlines share one width; list top lines on Inbox and projects; header buttons level with the title; sidebar icons, logo and pill in one column; check icon drawn bold on filled circles
- [x] Appearance: the segmented control out of its box, the selected segment in primary
- [x] Checks: lint, format, typecheck, 60 unit tests, web export
- [ ] Human checks the preview

## Notes

- Screens were checked with screenshots of a web build in the cloud, with the Supabase calls answered by a local stub (demo tasks and a demo profile), at 1440 wide light and 390 wide dark. No real account or the human's browser was used.
- The prototype was run locally and screenshotted (Today, task detail, Projects, Profile, Calendar, palette) to read its layout and motion. Its styling (indigo, points ring, coloured project dots) is not carried over.
