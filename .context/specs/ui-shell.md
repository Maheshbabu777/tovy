# App shell and screens from the design

Status: approved

Size: large (touches every screen and the routing, no database change).

## Problem

The app works but looks nothing like the human's Figma prototype. Today it is one plain stack of cards with the default router header, no navigation, no greeting and no per task detail screen (see `.context/design/before-tasks-phone.png` next to `figma-today-phone.png`). Only the colours and font names were copied from the design, never the layout. This spec rebuilds the screens in the design's layout: the app shell (tabs on a phone, sidebar on a wide screen), Today, task detail, Projects and Profile, plus the sign in and setup screens in the same look. The design is a reference for the look and the layout, not for functionality (`design-notes.md`): where it shows something the project plan puts in a later phase, it is left out.

Reference images (taken from the prototype): `.context/design/figma-today-phone.png`, `figma-today-desktop.png`, `figma-projects-phone.png`, `figma-task-phone.png`, `figma-profile-phone.png`.

## Acceptance criteria

1. **Shell.** Below 768 px wide there is a bottom tab bar with Today, Projects and Profile (icon above label, the active tab in the accent colour, a thin top line, safe area respected). At 768 px and wider there is a left sidebar with the logo and name, a "Quick add" button that focuses the add field, and Today, Projects and Profile (the active one on a grey pill). No default router header anywhere. The page background is white, text is Geist (and Geist Mono for percentages), loaded with the app so it shows on web and on a phone.
2. **Today.** A date line and "Good morning, <first name>" (afternoon and evening by the device clock), the first name from the user's profile. An add field at the top. Tasks that are not done are grouped as Overdue, Due today, Coming up (due in the next 7 days) and Anytime (no due date), each with a group name and a count, empty groups hidden. Done tasks completed today show in "Done today" at the bottom, struck through. A row is a round check (38 px hit area, green when done), the title (15 px, medium), and a meta line with the due text ("Today, 4 PM", "Mon 5 Oct") and a coloured project dot with the project name. A deep task with subtasks shows a progress ring instead of the plain check and its percentage in Geist Mono on the right (done subtasks over all subtasks, shown as "40%"). Tapping a row opens its detail. A sync status shows quietly in the header ("synced" or "pending N").
3. **Task detail.** A screen with a back arrow and a trash icon (delete with the 5 second Undo as now, back on the list afterwards), the title as an editable heading, chips for the due date, the project and the kind that open the matching editor (a date and time field, the list of projects with "No project", quick or deep), and a note field. A quick task shows the design's explainer card with "Mark done" and "Make it deep". A deep task shows its subtasks as rows with a progress bar and an add field, each subtask opens the same detail screen. Every rule that exists now still holds (no cycle, only a deep task has subtasks, a deep task with subtasks stays deep, delete and Undo cover every level).
4. **Projects.** A "Projects" heading with a plus button. A card per project: colour dot, name, "N tasks, X% done" (singular for 1, X is done tasks over all its tasks) and a thin progress bar in the project's colour. A "No project" card is shown when tasks have none. Tapping a card opens that project's page: its name (editable), colour (the five colours), delete (tasks move to "No project", as now) and its task rows.
5. **Profile.** The user's initials in a coloured circle, first and last name, the email, "@username", and how they sign in ("Google linked" or "Email code"). Rows for Sync status ("Up to date" or "N changes waiting") and Sign out (with the unsynced changes warning that exists now). Nothing else: the design's AI and Settings rows belong to later phases and are not shown as dead links.
6. **Sign in and profile setup** use the same look: centred, logo with the "tovy" name, the same inputs and buttons, white background.
7. **Same behaviour.** Everything that works today keeps working: sync, offline, undo, subtasks, projects, the profile gate, sign out clearing local data. The e2e suite is updated to the new screens and passes. Lint, format check, typecheck and unit tests pass.
8. **Looks like the design.** For each screen, a screenshot at 430 px and at 1280 px wide (made from the real app with seeded data) is compared with the reference image, and what still differs is written in the spec's Evidence. The human judges the result on the Vercel preview before this spec is marked done.

## Out of scope

- The Inbox tab and everything AI (Claude chip, approvals, connected apps, activity feed, prompt kit): Phase 6.
- Routines and streaks, the points ring on Today ("64 %", "54 points to close"), freezes, the Streak and Calendar screens, search: Phases 4 to 8 (`design-notes.md`).
- Quick add parsing of dates and times from text ("call mum tomorrow 5pm"): Phase 3. The add field adds a task with the typed title.
- Reminders, appearance and dark theme, notification and export settings, replay first launch, delete account: later phases.
- Partial progress logged by the user and the progress history: Phase 5. The percentage shown here is only done subtasks over all subtasks.

## Open questions

- The Inbox tab is in the design's tab bar. Leave it out until Phase 6 (no dead tab)? Answer: leave it out (decision for the plan, change it if you disagree).
- Today's groups differ from the design (it shows Routines, Due today and In progress, which need routines and logged progress). Is Overdue, Due today, Coming up and Anytime right for now? Answer: pending, built this way unless the human says otherwise.
- The human said the current UI is bad and the design must be followed (2026-10-02). Approved on that basis.

## Plan

How the work is done, because the earlier screens were written without looking at them: for every screen, build it, take screenshots at phone and wide width from the real app with seeded data, put them beside the reference, fix what differs, and only then run tests. The full e2e suite runs once at the end of a slice that changes behaviour, not after every edit.

Routing: Expo Router with a tabs group (`app/(tabs)/index.tsx` Today, `projects.tsx`, `profile.tsx`) and stack screens `app/task/[id].tsx` and `app/project/[id].tsx`. The sign in and profile gate and the per user tasks store move to the root layout and are shared through a React context, so every screen reads the same store. The width switch (tabs or sidebar) is one layout component.

1. **Shell and look.** Fonts (Geist and Geist Mono), tokens extended, icons, the tab bar and sidebar, root layout with the gate and store context, sign in and setup screens restyled. Test: screenshots against the reference, then the sign in and profile e2e tests.
2. **Today.** Greeting, groups, rows with the project dot and meta, progress ring and percentage, add field, delete with Undo on the row's swipe or in detail. Test: screenshots, a unit test for the grouping and the greeting and date text, e2e for add, done, groups.
3. **Task detail.** Screen, chips and editors, explainer card, subtasks and progress bar, delete and Undo. Test: screenshots, e2e port of the subtask, undo and edit tests.
4. **Projects and project page.** Cards with progress, project page with rename, colour and delete. Test: screenshots, unit test for the counts and percentage, e2e port of the project test.
5. **Profile and the rest.** Profile screen, sync status, sign out with the warning, e2e for sign out and offline. A final pass over every screen at both widths, the full e2e suite once, and the human's look at the preview.

Risks:
- A big restructure of routing and state can break sync or the profile gate. Mitigation: the store and gate are moved, not rewritten, and the e2e tests for sign out, offline and the profile step are ported in slice 1, not at the end.
- Fonts on a phone need `expo-font` loading before the first render. Mitigation: the root layout waits for them (a plain splash), checked on web now and in Expo Go by the human.
- Seeing the screens needs a signed in session with data. Mitigation: a screenshot script that creates a temporary user with sample tasks through the admin API, signs in, and deletes the user (already used to take the "before" picture, to be kept under `tests/` as a dev tool).
- Expo Router's tabs and stack have their own back and focus behaviour, and e2e tests rely on stable element names. Mitigation: keep the existing test ids where the element still exists.

## Progress

- [x] Plan approved (human, 2026-10-02: follow the design)
- [ ] 1 Shell and look
- [ ] 2 Today
- [ ] 3 Task detail
- [ ] 4 Projects and project page
- [ ] 5 Profile and the rest

## Evidence

(none yet)

## Notes

- The human's feedback that triggered this spec: the UI "is literally bad right now", and slow, error-prone progress on the earlier specs. The earlier tasks screen was checked only by tests and never looked at (`before-tasks-phone.png` is the first time it was). This spec's rule is to look first.
- Plain words in the UI: "No project", "Coming up", "Anytime". No em dashes or en dashes in anything shown to people (`preferences.md`).
