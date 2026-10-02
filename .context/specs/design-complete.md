# Finish the design: Inbox, Projects, Profile, Task detail, Today

Status: approved

Size: large (new tables, every tab). Done in phases, each merged on its own so the database changes reach the dev project first (`decisions.md`: migrations apply when they merge to main).

## Problem

After the shell, sign in and Today were rebuilt, the human tried the deployed app (2026-10-02) and said the colours, icons and tokens are right but the screens still do not feel like a real app: the Projects tab is an empty placeholder in a default font, Inbox (the core feature, the AI approval inbox) is missing, the Profile screen is not how profile and settings screens in real apps work, components feel generated, and a "synced" label sits on Today where users do not need it. The rule from the human: show users only what is useful to them, judge every screen from the user's side, make every section smooth and comfortable to move through, and finish the whole design.

## Acceptance criteria

1. **No technical noise.** Nothing on screen says "synced" or "pending". Offline and failed saves show the existing banner; Profile shows a plain sync row (`Up to date`, `Offline`, `N changes waiting`).
2. **Database (phase 1).** Migration `0006` adds `tasks.progress` (0 to 100, default 0), `progress_log` (append only: task, change in percent, progress after, note, who made it, the local day) and `proposals` (what a connected AI app asks for: app name, kind add task, update progress or reschedule, title, before and after, status pending, approved or rejected). Every table is owned by one user, row security tested the same way as tasks.
3. **Inbox (phase 2)** as design 11.11 and the tab and sidebar entry of 11.0 with the count badge: groups by app, rows with Approve and Reject (web) and swipe (phone), detail sheet "What this changes", Approve all, toasts with Undo, loading, empty and caught up states. Approving applies the change (add task, set progress, move the due date); rejecting does nothing. Proposals reach the table from the connected app side (the MCP server is a later spec); until then they are created by tests and by the admin API.
4. **Projects (phase 3)** as 11.15 and 11.16: cards with dot, name, "N tasks . X% done", bar; new project sheet; project page with its tasks, rename, colour, delete; empty states. All text in the Geist fonts, sentence case.
5. **Profile (phase 4)** like the settings screen of a real app: identity header that opens Edit profile (first name, last name, username with the same rules as setup), grouped rows with icon, label, value and chevron (Appearance opens its own page with theme and accent, Sync status, Inbox and connected apps shortcut, Help and about, Sign out, app version at the bottom). Only rows that work are shown. Sign out keeps the unsynced warning.
6. **Task detail (phase 5)** as 11.9 including the quick task card, deep task progress card with ring, slider, +5/+10/+25, progress log, subtasks, date sheet, project chip, delete with Undo. Points are 1.5 per percent.
7. **Today (phase 6)** as 11.6: header icons, hero card with the daily ring (150 points), "In progress" section, partial progress rings on rows. Routines and streak are the next spec.
8. **Later, in this order:** routines and streaks (11.13), calendar (11.12), command palette (11.8), reminders and repeat, connected apps and the MCP server (11.20 to 11.25), onboarding, export and delete account. Each gets its own spec when its turn comes.
9. **Looks and feels right.** Each phase is screenshotted in light and dark at phone and wide width and reviewed against the design before tests; the human judges on the Vercel preview. Lint, format, typecheck, unit and e2e tests pass.

## Plan

Phase 1 is its own pull request (migration and row security test), merged first. Phases 2 to 6 follow as pull requests of their own, each with the e2e tests for its screens.

## Progress

- [x] Approved (human, 2026-10-02: go all in and complete the design)
- [x] 1 Database
- [x] 2 Inbox
- [x] 3 Projects
- [x] 4 Profile
- [ ] 5 Task detail
- [ ] 6 Today

## Evidence

(none yet)

## Notes

- The old `ui-shell` spec keeps the shell, sign in, Today list and Profile basics; its remaining slices (Task detail, Projects, polish) are replaced by this spec.
- Open: whether the home tab should be called Today. The design calls it Today, so it stays unless the human says otherwise.
