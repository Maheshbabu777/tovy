# App shell and screens from the design

Status: done

Shell, sign in, Today list and Profile basics were built here; the rest finished under `design-complete.md`.

Size: large (touches every screen and the routing, no database change).

## Problem

The app works but looks nothing like the human's design. Today it is one plain stack of cards with the default router header, no navigation, no theme and no per task detail screen (see `.context/design/before-tasks-phone.png` next to `figma-today-phone.png`). Only colours and font names were copied from the prototype, never the layout, and the button, input and card shapes differ from the design (pill buttons instead of radius 10, weight 700 text, no dark theme).

The human then wrote the complete design specification, saved as `.context/design/design-spec.md` (called "the design" below). This spec rebuilds the screens in that design: tokens and theme, the component set, the app shell, sign in, Today, task detail, Projects and Profile. The design describes the finished product including features that belong to later phases (progress points, streaks, calendar, AI inbox). Those are not built here and are listed under "Later specs", each with the design section that covers it.

Reference images from the prototype: `.context/design/figma-*.png`.

## Acceptance criteria

1. **Tokens and theme.** Light and dark themes with the exact colours in design section 1 (base tokens, the ink opacity ladder, accent-soft, ok/warn/bad, project colours, toast colours), the three accent options, radius, spacing, elevation and type scale from sections 2 and 3, one easing curve and the durations in section 4. Theme is Light, Dark or System (follows the device live) with a 220 ms cross-fade, and the choice is kept on the device. Fonts are Geist (400, 500, 600 only, never 700) and Geist Mono for data, loaded with the app. Reduced motion (device setting) removes the animations.
2. **Components** in the sizes and states of design section 7, used by the screens below: button (primary, soft, ghost, danger, default and small), icon button, chip, toggle, segmented control, text input (with label, error message and focus), OTP input, top bar, task row, section header, settings group and row, card, bottom sheet and centred modal, dialog, toast with Undo and countdown bar, empty state, skeleton, sync banner, avatar, checkbox, progress bar (the AI badge, hero card, ring and slider come with their later specs). Every icon-only control has an accessible label and every interactive element a visible 2 px focus ring.
3. **Shell.** Below 768 px a bottom tab bar (Today, Projects, Profile, 64 px tall plus the safe area, icon above label, active in the accent colour, 95% background with blur, top line). At 768 px and wider a left sidebar: logo and name, an accent "Quick add" button, the same three items with a shortcut letter, collapsible between 240 and 68 px (icons only with tooltips when collapsed), with the choice remembered. Content widths from 3.2. A route change fades in over 180 ms. No router header anywhere. (The Inbox, Calendar and Streak entries of the design come with their specs.)
4. **Sign in and register** exactly as 11.3 and 11.4: one combined screen with "Welcome to Tovy", Google (web), the email field and "Email me a code"; the validation messages of 11.3; then the code screen with six cells, "Check your email", the 11.4 error lines, auto submit on the sixth digit, and "Resend code in 23s" counting down from 30 s (or the wait the server names). The profile setup step (first name, last name, username) uses the same look.
5. **Today** as 11.6 without the points hero card, routines and streak line (later specs): date line, greeting by the device clock with the first name from the profile, a quick bar (top on wide, sticky above the tab bar on a phone with the fade) that opens the quick add sheet of 11.7 without the date parsing (date and project are chosen with chips), sections Overdue, Due today, Coming up (next 7 days) and Anytime (no date) with counts and empty ones hidden, task rows of 7.14 (ring or check 26 px, title, due text, project dot and name, percentage in Geist Mono for a deep task from its done subtasks), the sync banner and skeleton and empty state of 7.22 to 7.24, delete with the toast and Undo of 7.21. Right-click or long-press opens the context menu of 7.20 (Open, Move to tomorrow, Delete).
6. **Task detail** as 11.9: a full screen on a phone, a 420 px side panel on wide; back and trash, editable title, chips for date (opens the date sheet of 11.10 with the date and "No date" groups only), project and kind; quick task shows the explainer card with Mark done and a way to make it deep; a deep task shows the progress bar from its subtasks, the subtask list (each opens the same detail, with an add field) and a note. The progress log, slider, reminders, repeat, attachments and AI badge come with their specs. Every rule that exists now still holds (no cycle, only deep tasks have subtasks, a deep task with subtasks stays deep, delete and Undo cover every level).
7. **Projects** as 11.15 and 11.16: grid of cards (1 column, 2 from 640 px) with dot, name, "N tasks . X% done" (singular for 1) and the 4 px bar, a plus button and the new project sheet with the five colour swatches, and a project page with rename, colour, delete (tasks move to "No project", as now) and its tasks. A "No project" card shows when tasks have none.
8. **Profile** as 11.17 limited to what exists: avatar with initials, name, email, "@username", how the person signs in; Appearance (theme and accent, 11.18); Sync status ("Up to date", "Offline", "Error" or "N changes waiting"); About (logo, name, version from the app config); Sign out with the dialog of 11.17 and the unsynced changes warning that exists now. Rows for later features (AI group, notifications, streak freezes, export, replay first launch, delete account) are not shown.
9. **Same behaviour.** Sync, offline, Undo, subtasks, projects, the profile gate and sign out clearing local data all keep working. The e2e suite is updated to the new screens and passes. Lint, format check, typecheck and unit tests pass.
10. **Looks like the design.** For each screen, screenshots at 430 px and 1280 px wide in light and dark (made from the real app with sample data by `tools/screenshots.mjs`) are compared with the design, and what still differs is written in Evidence. The human judges the result on the Vercel preview before this spec is marked done.

## Later specs (not built here, each cites its design section)

Each needs its own spec when its turn comes. Order follows the project plan.

- **quick-add-parsing:** date, time and weekday read from the typed words (11.7 rules).
- **progress-and-ring:** slider, progress log, points, the Today hero card and ring closed celebration (7.7, 11.6, 11.9, 11.14).
- **routines-and-streaks:** routines section, streak screen, heatmap, freezes (11.13, 7.28, 7.29).
- **calendar:** week and month, drag to reschedule (11.12).
- **reminders-and-repeat:** reminders, recurrence, notification and day preferences, haptics (11.10, 11.19, section 6).
- **ai-inbox-and-mcp:** Inbox tab with approvals and swipe, connected apps, app detail, add a connection, consent, activity feed, prompt kit, AI badge (11.11, 11.20 to 11.25).
- **command-palette-and-shortcuts:** palette, keyboard shortcuts (11.8, 6.1).
- **onboarding:** splash, welcome slides, four step onboarding, replay first launch (11.1, 11.2, 11.5).
- **account-and-export:** export data, delete account, about links (11.17, 11.26, 11.27).

## Open questions

- The design's tab bar and sidebar include Inbox. It is left out until `ai-inbox-and-mcp` so there is no empty tab. Agree? Answer: left out (decision for the plan, say if you want the empty Inbox screen now).
- Resend wait: the design says 30 s, Supabase may refuse a second code to the same address within 60 s. The screen follows the design and switches to the wait the server names if it refuses. Fine? Answer: yes unless the human says otherwise.
- Today's groups before the progress and routines specs: Overdue, Due today, Coming up, Anytime in place of the design's Routines, Due today, In progress. Answer: pending, built this way unless the human says otherwise.
- The human gave the design and said to follow it (2026-10-02). Approved on that basis.

## Plan

How the work is done, because earlier screens were written without looking at them: for every screen build it, take screenshots from the real app with sample data at phone and wide width in light and dark, put them beside the design, fix what differs, and only then run tests. The full e2e suite runs once at the end of a slice that changes behaviour. Library behaviour is read before it is used (Expo Router's `Tabs` import is deprecated in this version, the headless `expo-router/ui` tabs are used for the shell).

One branch (`feat/ui-shell`), one commit or more per slice, pushed as it goes so the Vercel preview of the branch shows progress. One pull request at the end, so main never shows a half finished shell.

Routing: Expo Router with a tabs group (`app/(tabs)/index.tsx` Today, `projects.tsx`, `profile.tsx`) and stack screens `app/task/[id].tsx` and `app/project/[id].tsx`. The sign in and profile gate and the per user tasks store sit in the root layout and are shared through a React context. The width switch (tab bar or sidebar) is one layout component. On wide screens the task detail opens as a side panel next to the list (a route that renders the panel), on a phone as a full screen.

1. **Foundation and shell.** Fonts, tokens for both themes, theme provider and the Appearance storage, icons (Lucide), the first components (button, icon button, input, chip, card, segmented), root layout with the gate and store context, the shell with tab bar and collapsible sidebar, `tools/screenshots.mjs`. Test: screenshots of the shell in both themes, then unit tests for the theme choice and the tokens.
2. **Sign in screens.** Combined sign in, OTP cells and screen, profile setup, in the new look. Keep the test ids; port `c1` to `c4`, `p1`, `p2`, `so1` to `so3`.
3. **Today.** Rows, sections, quick bar, quick add sheet, toast and Undo, banner, skeleton, empty state, context menu. Unit tests for the grouping, the greeting and the due text. Port the add, edit, done, undo tests.
4. **Task detail.** Screen and side panel, date sheet, subtasks and progress bar, delete. Port the subtask and offline parent tests.
5. **Projects.** Cards, new project sheet, project page. Unit test for the counts and percentage. Port the project test.
6. **Profile and polish.** Profile, Appearance, sync status, About, sign out dialog. A pass over every screen in both themes and widths against the design (focus rings, labels, contrast), then the full e2e suite once and the human's look at the preview.

Risks:
- A big restructure of routing, theme and state can break sync or the profile gate. The store and gate are moved, not rewritten, and the e2e tests for sign out, offline and the profile step are ported in slices 1 and 2.
- Dark theme and the theme cross-fade touch every component. Mitigation: components read colours only from the theme hook, never from a constant, from slice 1 on (a lint rule or a unit test that fails on a raw colour in `src/ui`).
- Custom fonts on a phone need loading before the first render, and each weight is its own font family. Mitigation: the root layout waits for them and no style uses `fontWeight`, checked on web now and in Expo Go by the human.
- Expo Router's tabs and stacks have their own back and focus behaviour. Mitigation: read the installed version's types first, keep existing test ids where the element still exists.
- Blur, hover and drag behaviours differ between web and a phone. Mitigation: the first release follows the design where the platform allows it and the differences are listed in Evidence.
- The design is long. Anything in it not covered by a criterion above or by a later spec is a gap to raise, not to invent.

## Progress

- [x] Plan approved (human, 2026-10-02: follow the design)
- [x] 1 Foundation and shell
- [x] 2 Sign in screens
- [x] 3 Today
- [ ] 4 Task detail
- [ ] 5 Projects
- [ ] 6 Profile and polish (Profile, Appearance, sync status, About, sign out dialog done; polish pass left)

## Evidence

(none yet)

## Notes

- The human's feedback that triggered this spec: the UI "is literally bad right now", and slow, error-prone progress on the earlier specs. The earlier tasks screen was checked only by tests and never looked at (`before-tasks-phone.png` is the first time it was). This spec's rule is to look first.
- Plain words in the UI come from design section 10 and the exact strings from section 11. No em dashes or en dashes in anything shown to people (`preferences.md`).
