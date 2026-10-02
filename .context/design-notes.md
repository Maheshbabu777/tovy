# Design notes (Figma Make prototype)

Source: https://dress-potato-46293176.figma.site, reviewed on 2026-10-02 by rendering it in a headless browser on a phone width (430 px) and a desktop width (1280 px). Not every control was reachable: the deep task view, the quick add sheet, the search screen, the Month calendar and the Profile sub-screens were not opened.

This is input for the specs (`tasks`, `design-tokens`, and Phases 3 to 10). It is not itself approved scope.

## Screens seen

- **Today:** greeting and date, a progress ring ("64 %", "54 points to close", "96 of 150 progress points today. Partial progress counts.", "14 day streak, 2 freezes left"), then groups: Routines, Due today, In progress. Rows have a round check or a small progress ring, a title, a date, a project dot with the project name, an optional "Claude" chip and a percentage. An "Add a task..." bar with the hint "call mum tomorrow 5pm".
- **Inbox:** the AI approval inbox. "4 waiting for your approval", "Approve all", proposals grouped by AI app (Claude, ChatGPT), each with a kind (Add task, Update progress, Reschedule), a time ago, and Approve and Reject.
- **Projects:** a card per project with a colour dot, "N tasks, X% done" and a progress bar. Six projects: Launch, Health, Studio, Personal, Admin, Research.
- **Profile:** name, email, "Google linked". Sections: AI (Connected apps, Activity feed, Prompt kit), Settings (Appearance, Notifications day and haptics, Streak freezes, Export data, Sync status), About, Replay first launch, Sign out, Delete account.
- **Calendar:** week view (Mon to Sun) with task chips per day, a Week and Month switch, "Drag a task onto another day to reschedule it.", and the day's list below.
- **Streak:** big streak number, best streak (41), freeze icons, the rule ("A day counts when you reach 150 progress points", "You get 2 per month"), a heatmap of progress points per day with a Less to More legend, "Tap a day to see its log".
- **Task sheet (quick task):** title, chips for date, project and a reminder, and the text "A quick task is done or not done. Switch to a deep task to log partial progress, add subtasks and keep a history." with Mark done and Track progress.
- **Navigation:** phone has a bottom bar (Today, Inbox with a count badge, Projects, Profile) and header icons for Search, Calendar and Streak. Desktop has a sidebar (Quick add with the shortcut Cmd K, Today T, Inbox I, Projects P, Profile, then Calendar, Streak, Collapse).

## Things the design tells us that change the plan

1. **Inbox means the AI approval inbox, not "tasks with no project".** The plan's "optional projects with an Inbox" was read the wrong way in the `tasks` spec. Tasks with no project need another name (proposed: "No project"). The word Inbox is reserved for Phase 6.
2. **Quick tasks and deep tasks are two kinds.** Subtasks, partial progress and history belong to deep tasks. A quick task is just done or not done. So subtasks need a `kind` on the task.
3. **Due dates have an optional time** ("Today, 4 PM"), not only a date.
4. **Projects have a colour**, used as a dot on every task row.
5. **Routines sit inside Today next to tasks and each has its own streak** ("12 day streak"). The plan only lists check-ins and counts for routines plus one global streak. Per routine streaks are new scope to decide in Phase 7.
6. **A Search screen** (header icon, and the Cmd K shortcut next to Quick add) is not in the plan.
7. **Tasks created by an AI carry a chip** with the app's name ("Claude"), so tasks need a source field in Phase 6.

## Inconsistencies found

Product and wording:
1. "1 tasks" and "0 tasks" on Projects (plural is wrong).
2. Two ways to add a task on desktop: the Quick add button (Cmd K) and the inline "Add a task..." bar (N). They may be meant to differ, but nothing says how.
3. The tab called Inbox is the AI approval inbox while the plan, and the first version of the tasks spec, used Inbox for tasks without a project.
4. Inbox rows show the word "Approve" more than once per proposal, and there is also a per app Approve and an Approve all. It is unclear which control does what.
5. Today groups tasks as Due today and In progress, but a task that is both (Draft API doc, due today, 40 %) appears only under Due today. The rule is not stated.
6. Settings label "Notifications, day and haptics" mixes three settings into one row.
7. "Streak freezes: 2 left" sits in Settings, but the freeze rule and count are also on the Streak screen and in the Today card. Three places show the same number.

Calendar:
8. The week title reads "Sep 28 to 4" (the second month is missing, it should be "Sep 28 to Oct 4").
9. Routines (Morning stretch, Read 20 pages, Inbox zero by noon) appear only on Friday. A daily routine should show on every day of the week.
10. The day's list under the calendar repeats what Friday's card already shows.

Visual:
11. Launch and Research have the same indigo dot, which is also the app's accent colour (buttons, ring, active tab) and the colour of the "Claude" chip. A project dot can be mistaken for the brand or for the AI chip. Admin is grey, so project colours are not a consistent set.
12. Numbers use a monospaced font in some places (40 %, the 14 on Streak) and the normal font in others (the 64 in the ring, the project percentages).
13. The progress ring on Today is 64 % while task rows use a small partial ring for 40 %. Both mean progress but they look different and use different sizes.
14. The heatmap has no month or weekday labels, and the last row is partly empty without explanation.
15. The Streak screen duplicates "Tap a day to see its log." and a "Today's log" button.
16. On phone, Calendar and Streak are header icons. On desktop they are sidebar items. Fine as an adaptation, but the entry points differ and the phone bottom bar has no way to see Calendar or Streak without finding the icons.

## Open for the human

- Which of these are bugs in the prototype and which are intended? Items 2, 5, 9, 13 and 16 look like questions, the others look like plain fixes.
- Should the web app and the phone app share one set of components (the plan says `*.web.tsx` only where behaviour differs)?
