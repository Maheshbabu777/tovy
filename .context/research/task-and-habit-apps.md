# Research: task apps and habit trackers

Written 2026-10-03 for the foundation reset (`specs/foundation-reset.md`). Sources are listed at the bottom. Reviews summarise the apps, so check a detail in the app itself before copying it exactly.

## Why this exists

The human tried the app on 2026-10-03 and said every screen, from sign in to the end, looks like a toy or a fun project, and that the points system (150 points to close the ring) means nothing. Before building more, we look at how the apps people already trust are put together, and copy the foundation, not the decoration.

## What the trusted task apps have in common

| Area | Todoist | TickTick | Things 3 | Microsoft To Do |
|---|---|---|---|---|
| Capture | Quick add reads plain words: date, time, repeat, `#project`, `p1` priority, `@label` | Same idea, a little weaker on complex repeats | Magic Plus button, drag it to where the task should go | Add to a list or to My Day |
| Main views | Inbox, Today, Upcoming, Browse (default phone tabs, 3 to 5 tabs, user can change them) | Smart lists, calendar, habits, focus | Inbox, Today (with This Evening), Upcoming, Anytime, Someday, Logbook | My Day (resets every night), Planned, lists |
| Organise | Projects with sections and sub projects, labels, 4 priorities, filters | Lists, tags, priorities, Eisenhower matrix | Areas, projects with headings, tags | Lists and groups |
| Dates | Due date plus a separate deadline, strong repeat engine ("every 2nd Monday") | Dates, repeats, time blocking on a calendar | Start date ("when") separate from deadline | Due date, repeat, My Day |
| Planning | Upcoming: week strip, dots under busy days, drag tasks between days | Calendar with tasks and events together | Upcoming grouped by day and week | Suggestions for My Day from yesterday and upcoming |
| Done tasks | Completed view, activity log | Completed list | Logbook | Completed section |
| Motivation | Karma: points, levels, daily and weekly goals, streaks. It sits in a side screen, users can set days off, vacation mode, or turn it off | Habit streaks, focus stats | None. The calm is the point | None |
| AI | Official MCP server (OAuth, read and write, works with Claude, ChatGPT, Cursor and others) | | | |

What makes them feel real and not like a toy:

1. **Capture in seconds.** Todoist's head of design: the time between thinking of a task and adding it should be seconds. Every app makes add one tap or one key from anywhere.
2. **The list is the hero.** Today is a plain list of tasks. No big cards, no score at the top. Numbers, charts and goals live on a separate screen you open on purpose.
3. **Dense, quiet rows.** Small check circle, title, one meta line only when there is something to say (date, project, label). Nothing printed for empty fields.
4. **Real planning views.** A week strip with dots on busy days, overdue tasks with one "Reschedule" action, drag between days.
5. **Done tasks go somewhere.** A Completed or Logbook view, not just a strikethrough that disappears.
6. **Empty screens teach.** Todoist redesigned its empty screens with tips for new users instead of blank pages.
7. **Gestures and haptics.** Swipe to complete or reschedule, long press to reorder, short haptic ticks (Things 3).
8. **Changes ship in small steps.** Todoist moved away from big redesigns to an update every couple of months, because big releases hurt users and the team.

## Habit trackers

| App | Habit types | Missed days | Stats |
|---|---|---|---|
| Streaks (iOS) | Daily, weekly or chosen days, Apple Health auto check | Resets, has a pause for planned breaks | Ring per habit, streak count |
| Loop (Android, open source) | Yes or no, and measurable ("8 glasses of water"), custom intervals like 3 times a week | No hard reset: a habit strength score that drops a little | Calendar heatmap, frequency chart, streak history, CSV export |
| Habitify | Grouped by morning, afternoon, evening, anytime, with a journal note | Shown in reports | Completion rate, best and worst habits of the week |
| TickTick habits | Daily, weekly, custom, shown in the Today list next to tasks | Streak and longest streak | Completion rate (no dense heatmap, which reviewers miss) |
| Everyday | Daily chains | Mark a day "not applicable" and the streak pauses | Chain grid |
| Habitica | Habits, dailies, to dos in an RPG | You lose health points | XP, gold, levels. Reviewers call the UI dated |

Patterns that hold up:

- Streaks belong to a habit, not to the whole day. Each habit has its own schedule and its own streak.
- Forgive instead of punish: skip a day, pause for a trip, or a strength score that dips. The Smashing Magazine streak article warns streaks can make people anxious and guilty, and suggests freezes, grace windows and kind wording when a streak ends.
- Two kinds of habit: done or not done, and a count with a target.
- One heatmap per habit is what dedicated trackers have and bundled ones miss.

## Gamification, and what it means for points

- Todoist Karma is the best known version, and it is optional and out of the way: a separate screen, days off, vacation mode, and an off switch.
- Critics (Hulry) say points push people to add easy tasks ("water plants") to hit a number, while real days have 2 or 3 tasks that matter.
- Conclusion for Tovy: no points and no daily ring on Today. Partial progress per task stays, because it is real information about a task ("40% done"), not a score. Any totals (tasks done this week, habit streaks, a heatmap) live on a stats screen the user opens on purpose.

## Icons

| Set | Size | Styles | React Native | Notes |
|---|---|---|---|---|
| Lucide (in use now) | 1,500+ | Outline only, stroke width adjustable | `lucide-react-native` 1.50 | No filled versions, so the active tab cannot switch to a filled icon |
| Phosphor | 7,700+ (counting weights) | Thin, light, regular, bold, fill, duotone | `phosphor-react-native` 3.0.6, needs only `react-native-svg` (already installed) | Regular and fill pairs fit the Android pattern of an outline icon that fills when its tab is active |
| Heroicons | about 290 | Outline, solid, mini | Community ports | Too small a set |

## How this maps to Tovy

Keep (Tovy's own reasons to exist): AI apps connect over MCP and every write waits for approval; real partial progress with a log on bigger tasks; routines and habits next to tasks; local first, instant taps.

Copy as the foundation: fast natural language quick add; Inbox, Today, Upcoming as the main views; projects with sections, labels, priorities; due date and deadline; repeats and reminders; Upcoming week strip with drag; overdue with Reschedule; completed log; search; empty screens that teach; swipe, long press and haptics on the phone.

Drop: points, the 150 point ring, the global day streak with freezes, and the Ring closed celebration.

## Sources

- Todoist review, features and pricing: https://dupple.com/reviews/todoist
- Todoist Karma help: https://www.todoist.com/help/articles/introduction-to-karma-OgWkWy
- Todoist Upcoming view: https://www.todoist.com/inspiration/todoist-upcoming-view
- Todoist navigation bar help: https://www.todoist.com/help/articles/customize-the-todoist-navigation-bar-L4qpkI0xj
- Todoist redesign interview (Adobe XD Ideas): https://xd.adobe.com/ideas/perspectives/interviews/reimagining-an-app-from-the-ground-up-behind-the-scenes-of-todoists-redesign
- Todoist MCP server: https://www.usecarly.com/blog/todoist-mcp/ and https://github.com/Doist/todoist-mcp
- TickTick review: https://clickup.com/learn/topic/task-management/tools/ticktick/ and https://habitbox.app/blog/ticktick-review
- Things 3 review (MacStories): https://www.macstories.net/?p=48965
- Microsoft To Do, My Day: https://support.microsoft.com/en-us/ToDo/my-day-and-suggestions
- Habit trackers: https://softpicker.com/best-habit-tracker-apps/ and https://habi.app/insights/best-streak-tracker-apps/
- Streak design: https://smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/
- Gamification criticism: https://hulry.com/firesides/gamification/
- Icon sets: https://www.pkgpulse.com/guides/lucide-vs-heroicons-vs-phosphor-react-icon-libraries-2026
