# Backlog

Things agreed to do later. Each becomes a spec in `specs/` when its turn comes. Newest at the bottom of each list. When an item is done or dropped, delete it here and note it in its spec.

## Left over from stage 1 (`specs/foundation-reset.md`)

- The human checks the Vercel preview (https://tovy-git-feat-foundation-reset-maheshbabu777s-projects.vercel.app) himself: every signed-in screen (Today, Inbox, Projects, a project, task detail, Profile, Appearance) at phone and wide width in light and dark next to the Paper file, and reports what differs.
- Run the e2e suite with the Supabase secrets (`h1`, `t2` and the dark background check were edited without a run).
- Component gallery screen, reachable only in development, showing every shared component in every state (criterion 5).
- Restyle the components still drawn from the old design (task row meta line, section header, quick add sheet, chips, settings rows, menu, toast) to match Paper 02 Components one by one; today they only picked up the new colours.
- Project colours: every project shows grey for now (`PROJECT_COLORS` in `src/ui/theme.tsx`). Decide in the information architecture stage whether projects keep any colour.
- Local shell on the human's Windows machine cannot finish `npm ci` in one run; checks run in a cloud copy. Worth a note in `project.md` Gotchas if it keeps happening.

## Later stages (order from the spec)

- Stage 2, information architecture: tabs Inbox, Today, Upcoming, Browse; retire the approval Inbox screen and the proposals table; empty screens that teach.
- Stage 3, tasks: quick add that reads words, priorities, labels, sections, deadline, overdue Reschedule, completed log.
- Stage 4, Upcoming week strip with drag.
- Stage 5, motion and gestures (Reanimated, Gesture Handler, sheets, swipe, haptics), checked in Expo Go.
- Stage 6, habits with per habit streaks, skip and pause, heatmap.
- Stage 7, MCP with direct writes, destructive tools that ask in the AI app, activity feed with undo, Trash.

## Ideas from the human

- **Profile as a tagged ID card** (2026-10-03). The human wants the profile to feel different, like the lanyard ID badges many modern sites use. Reference: Vercel's interactive 3D event badge (a card on a lanyard you can drag and swing; built with React Three Fiber, react-three-rapier physics, Drei and MeshLine, the name rendered onto the card with a texture). Open points for its spec:
  - What the card shows: the mark, name, @username, member since, maybe connected AI apps or a small task count, in the black and white style.
  - Platform: the 3D lanyard works on web with React Three Fiber; on Android it needs expo-gl and the native React Three Fiber renderer, which is heavy, so a 2D card that tilts and swings with Reanimated and gestures may be the phone version.
  - Performance: physics and 3D cost battery and frames on low-end phones; Reduce Motion must show a still card.
  - Fits after stage 5 (motion and gestures), since it needs the same libraries.
