# Tovy design brief

Hand this to Figma or Claude Design. Source: `.context/project-plan.md` and the "Life OS" design doc (UI tab). Items marked **DECIDE** are open and need the human's answer before or during design.

## 1. Product in three lines

- Tovy is a local-first task and routine app that AI apps (Claude, ChatGPT and others) can read and write through MCP, with an approval inbox so the user stays in control.
- Tasks carry real partial progress with a log, streaks forgive a missed day (2 freezes a month), and the heatmap counts progress points, not ticked boxes.
- Feel: calm, fast, focused. Every tap answers in under 100 ms. Android first, plus a web app.

## 2. Platforms

- **Phone (Android first):** bottom tab bar with Today, Inbox, Projects, Profile. Bottom sheets for quick add and pickers.
- **Web:** sidebar plus detail layout, keyboard shortcuts, hover and right-click menus, a command palette for quick add. Also hosts the AI consent screen and the landing page.
- Design every screen for both, except the ones marked web only.

## 3. Design foundations

| Item | Direction | Status |
|---|---|---|
| Accent | Indigo | **DECIDE** exact shade |
| Neutrals | Ink opacity scale (one ink color at stepped opacities) | **DECIDE** the steps |
| Font | Geist, bundled | set |
| Theme | Light and dark | **DECIDE** both at launch, or one first |
| Radius, spacing | Small fixed scales in `src/ui/tokens.ts` | **DECIDE** values |
| Motion | Transform and opacity only, 60 fps on a mid-range Android, Reduce Motion respected | set |
| Haptics | On key actions (check off, ring closed, approve) | set |
| Charts | Skia ring and heatmap, ring-closed burst (Lottie or Rive) | set |
| Name and logo | Current icons are Expo defaults | **DECIDE** |

Shared components to design once: tab bar, sidebar, top bar, buttons, inputs, list rows, progress ring, progress slider, chips, badges (including the AI badge), bottom sheet, dialog, toast with undo, avatar, empty state, skeleton.

## 4. Flows

### A. First launch
Splash, welcome carousel, login (Google or email OTP), OTP entry, onboarding (what Tovy is, notification permission, connect first AI app, first task or routine), Today.

### B. Daily loop
Today, quick add (type "call mum tomorrow 5pm", date parsed), task detail, log progress (slider or +%), daily ring fills, ring closes, celebration, streak updates.

### C. AI loop
Connected apps, add a connection (MCP URL, copy, per-app steps), AI app asks to connect (web consent screen), AI adds a task, push notification, approval inbox, swipe to approve or reject, item appears on Today with an AI badge, activity feed records it.

### D. Routines and streaks
Routine check-in on Today, count and streak on the routine, missed day spends a freeze, heatmap and streak screen.

### E. Planning
Calendar week and month, drag a task to another day to reschedule, reminder picker and repeat rules.

### F. Account
Profile, Settings, notification settings, export data, delete account, sign out.

## 5. Screen inventory

State key: **E** empty, **L** loading, **X** error, **O** offline. Every list and data screen needs E, L, X and O unless noted.

### Entry and auth
1. Splash
2. Welcome carousel
3. Login (Google button, email field). No separate password screen.
4. Register. Same flow as login with Supabase Auth. **DECIDE** whether to show a distinct "Create account" screen or one combined screen.
5. OTP code entry (resend, wrong code, expired code)
6. Onboarding steps (notifications permission, connect first AI app, first task)
7. First launch while offline

### Core product
8. Today (routines, due, in progress, quick-add bar)
9. Quick-add bottom sheet (date chip, project chip, priority)
10. Task detail, quick task variant
11. Task detail, deep task variant (progress slider, log, subtasks, attachments)
12. Create and edit task
13. Create and edit routine, routine detail
14. Inbox
15. Projects list, project detail, create and edit project
16. Calendar, week view
17. Calendar, month view
18. Streak and heatmap
19. Search with filters
20. Reminder and repeat picker
21. Undo toast after delete (5 s)
22. Ring-closed celebration

### AI connection
23. Approval inbox (swipe actions, approve all)
24. Approval detail (what the AI wants to change, before and after)
25. Connected apps list
26. Connected app detail (permissions, auto-approve, revoke)
27. Add a connection (MCP URL, copy, steps per AI app)
28. Activity feed (reads and writes)
29. Prompt kit (copyable phrases such as "add this to Tovy")
30. Consent screen, web only (app name, what it can do, allow or deny)

### Profile and settings
31. Profile (name, avatar, email, linked Google)
32. Settings home
33. Appearance (theme, accent)
34. Notifications and reminders
35. Day boundary and week start
36. Streak freezes (count left, how they work)
37. Haptics and Reduce Motion
38. Data: export, with progress and done states
39. Delete account (confirmation, what is removed)
40. Sign out confirmation
41. About (version, privacy policy, terms, support and feedback)

### System
42. Sync status indicator and sync error
43. Permission denied (notifications, storage)
44. Generic error, 404 (web)

### Web only
45. Landing page (hero, features, APK download, privacy link)
46. Sidebar layout, collapsed and expanded
47. Command palette and keyboard shortcut help
48. Hover and right-click menus on tasks
49. `/dev/components` gallery (internal, low priority)

## 6. Per-screen content notes (core screens)

**Today.** Greeting and date, daily ring, then sections: routines, due today, in progress. Each row shows title, progress, project, AI badge if AI-created. Quick-add bar pinned at the bottom (phone) or top (web).

**Task detail.** Title, due date, project, progress ring plus slider, progress log (append-only entries with time and source, human or AI), subtasks with equal weights, attachments, reminders.

**Approval inbox.** Pending items grouped by AI app, each showing the action ("add task: Draft API doc"), time, and swipe right to approve, left to reject. Batch approve.

**Streak and heatmap.** Current streak, freezes left, best streak, a heatmap of progress points per day, tap a day for its log.

**Connected apps.** App name, last active, permission level (read only, read and propose, auto-approve), revoke.

## 7. Competitor references

Screenshot for the moodboard: Any.do, TickTick, Todoist, Things 3, Microsoft To Do. None model partial progress or AI-driven input, so the progress log and approval inbox screens need original design, not a copy.

## 8. Open decisions

- Accent shade, ink steps, radius and spacing values
- Light and dark at launch, or one first
- App name and logo
- Distinct Register screen, or combined with Login
- Profile tab holds settings directly, or links to a Settings screen
- Phone and web breakpoints

## 9. Suggested design order

1. Tokens and shared components
2. Today and Task detail (needed first, phase 3)
3. Auth and onboarding
4. AI screens
5. Settings and system states
6. Calendar, streak and heatmap
7. Web only
