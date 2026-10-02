# Foundation reset: design system first

Status: approved

Size: risky (touches every screen, removes the points feature, and the next stages change the task schema). Done in stages, each with its own spec and pull request.

## Problem

The human tried the deployed app on 2026-10-03: from sign in to the last screen it looks like a toy or a fun project, and nothing feels like the task apps people trust. The points system (a daily ring of 150 points on Today) has no meaning to a user and should not be on screen; anything like it may only appear where a user goes looking for it. Earlier work built every screen at once from a design drawn for a demo user, without a shared design system, so each screen was styled on its own. The human wants to clean everything up and build a proper foundation like other apps, starting with a design system, a style guide and an icon toolkit, based on research into Todoist, other task apps and habit trackers (`.context/research/task-and-habit-apps.md`).

## Acceptance criteria

This spec covers stage 1, the design system. Stages 2 onward get their own specs (see Plan).

1. **Style guide.** `.context/design/style-guide.md` holds the approved visual direction: colours, type scale, spacing, radius, elevation, motion, icon rules and component rules, each with the reason. Where it disagrees with `design/design-spec.md`, the style guide wins and the design spec says so at the top.
2. **Reviewed visually before code.** The human approves the style guide as a rendered page (colours, type, components and icons shown in light and dark) before any token or component changes.
3. **Tokens match the guide.** `src/ui/tokens.ts` and `src/ui/theme.tsx` hold exactly the guide's values; the existing raw colour test (`src/ui/noRawColors.test.ts`) still passes.
4. **Icon toolkit.** One file maps each meaning (today, inbox, add, back and so on) to one icon, with an outline and a filled version where a selected state needs it. Screens import icons only from that file, checked by a unit test.
5. **Component gallery.** A screen reachable only in development shows every shared component in every state (default, hover, pressed, focused, disabled, error, loading) in light and dark, at phone and wide width. Screenshots of it are reviewed by the human.
6. **No points on screen.** The Today hero card, the 150 point ring, the "points to close" text and the Ring closed overlay are gone. Partial progress on a task (for example 40%) stays. The progress log keeps its data; nothing is deleted from the database.
7. **First screen fixed.** The loading state before the app is ready uses the theme background and the logo, never default black text.
8. Lint, format, typecheck, unit tests and the e2e suite pass (tests that checked points are removed with the feature, not weakened).

## Out of scope

- Moving or renaming tabs, quick add parsing, priorities, labels, sections, deadlines, habits, Upcoming, search, MCP. Each is a later stage with its own spec.
- New motion and gesture libraries (Reanimated, Gesture Handler, a bottom sheet library, haptics). Proposed as their own stage because they need an Expo Go check on a phone.
- A stats screen for totals and heatmaps. Later, and only reachable on purpose.

## Open questions

- Visual direction: what should Tovy feel like (Todoist, Things 3, native Android Material 3, or something else)? Answer: black and white, modern, after the human's inspirations (Devin and Cursor sites) (human, 2026-10-03). Structure still follows Todoist. Earlier answers the same day (Todoist colours, Jomo) were replaced. The source of truth is the Paper file `tovy`, page Design system.
- Accent colour: Answer: none. Primary is black (white in dark), red only for overdue and delete (human, 2026-10-03).
- Font: Answer: Geist and Geist Mono, as drawn in Paper (pending the human's review).
- Icon set: switch from Lucide to Phosphor for filled active states, or keep Lucide? Answer: Phosphor (human, 2026-10-03).
- The word Inbox: every other app uses Inbox for captured tasks with no project. Tovy uses it for AI approvals. Rename the AI screen (for example "Requests") and use Inbox the usual way? Built in stage 2. Answer: Inbox means captured tasks (human, 2026-10-03). There is no AI approval screen at all: AI apps write directly and ask the user inside the AI app before deleting or removing (human, 2026-10-03, see `decisions.md`). The current approval Inbox and the proposals table are retired in stage 2.
- Points data: hide only (keep tables and the log's point math for a later stats screen), or remove the point math too? Answer: hide only, keep the data and the math for a later stats screen (human, 2026-10-03).

## Plan

Stages, in order. Each stage is a spec and a pull request, approved before code, and the human looks at screenshots before the next stage starts.

1. **Design system** (this spec): style guide page for approval, then tokens, icon toolkit, component gallery, points removed from screens, loading screen.
2. **Information architecture:** tabs and sidebar (Inbox, Today, Upcoming, Browse or similar), retire the approval Inbox screen, empty screens that teach.
3. **Tasks done properly:** quick add that reads dates, times, repeats, `#project` and priority from words; priorities, labels, sections, due date and deadline; overdue with Reschedule; completed log.
4. **Upcoming:** week strip with dots, days list, drag to reschedule.
5. **Motion and gestures:** Reanimated, Gesture Handler, sheets, swipe actions, haptics, checked in Expo Go.
6. **Habits:** per habit schedule (daily, chosen days, N times a week), done or count, per habit streak with skip and pause, per habit heatmap.
7. **AI connection:** MCP server with direct writes, destructive tools that ask in the AI app, activity feed with undo, Trash, per app access, as in `project-plan.md` phase 6.
8. Then the rest of the project plan (reminders, search, onboarding, export).

Files for stage 1, in order: `.context/design/style-guide.md`; the rendered style guide page for review; `src/ui/tokens.ts`, `src/ui/theme.tsx`; new `src/ui/icons.ts` and its test; `src/ui/components/*`; a dev gallery route under `app/`; `src/ui/TodayScreen.tsx`, `HeroCard.tsx`, `RingClosed.tsx`, `app/_layout.tsx` (loading); the e2e tests for the hero ring (`h1`).

Risks:
- Restyling every component can break test ids and flows. Keep test ids, run the full e2e suite once at the end of the stage.
- A new icon set touches every screen. The icon map makes it one import per screen.

## Progress

- [x] Research (`.context/research/task-and-habit-apps.md`)
- [x] Open questions answered (accent and font are chosen on the style guide page)
- [x] Spec and plan approved (human, 2026-10-03: "okay start")
- [x] Style guide drafted (`.context/design/style-guide.md`, rendered as the Tovy Design System artifact)
- [x] Logo received (human, 2026-10-03): `assets/brand/tovy-mark-black.png`, `tovy-mark-white.png`, `tovy-app-icon.png`
- [x] Design system drawn in Paper (foundations, icons, components, phone light and dark, web)
- [ ] Design system approved in Paper
- [ ] `style-guide.md` rewritten from the approved Paper file
- [ ] Tokens and icon toolkit
- [ ] Component gallery
- [ ] Points removed, loading screen
- [ ] Checks pass

## Notes

- Supersedes the visual parts of `design-complete.md` and `ui-shell.md`. Their data and sync work stays.
