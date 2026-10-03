# Mobile screens planned one by one

Status: in review

## Problem

The human (2026-10-03, after the design-polish round): on a phone the UI feels loose and "designed without thought". Things do not sit in the right place: the search button and avatar bar stay on top of every screen, even pushed pages like Appearance, so a page has two headers. Screens are not shaped by their purpose, and the phone layout does not follow the basic laws of mobile UI. The web stays as it is; the phone gets the care. Each screen is planned on paper first (below), then built.

## Laws this spec applies

- **Thumb zone (Hoober; one-handed use is about half of all use):** frequent actions at the bottom: tab bar, add button, sheet actions, the action menu. The top is for reading and rare actions.
- **Fitts:** big and close for frequent targets: whole row tappable, 44 px minimum, the check has a 44 px hit area, the add button 56 px.
- **Hick:** one primary action per screen; secondary actions go in a sheet, not a toolbar of icons. Two or three header icons at most (Material 3 top app bar rule).
- **Jakob:** people expect what other task apps do: swipe a row to finish or reschedule, a bottom sheet for a task on a phone, long-press for actions, a large title that shrinks into a small bar as you scroll, back at top left on pushed pages.
- **Proximity and common region:** a header belongs to its screen; nothing global floats over a pushed page.
- **Doherty:** every tap answers within 100 ms (the store writes are local; motion never delays a save).
- **Peak-end:** finishing a task is the peak (check pop plus a short toast with Undo); nothing noisy.

## Screen plans (phone, under 768 wide)

Global frame: no top bar of its own any more. Each screen owns its header. Bottom: tab bar (Inbox, Today, Upcoming, Browse) with the sliding indicator, and the round add button above it on the four tab roots only (not on pushed pages, where the bottom is free and the add lives in that page).

1. **Today** (purpose: what to do now). Header: date line, greeting large title, day summary; one icon on the right: search. The large title collapses into a small sticky bar ("Today" plus the search icon) after you scroll past it. Sections as now; "Done today" is folded by default ("Done today 3", tap to open) so finished work does not push open work down. Rows swipe: right finishes, left moves to tomorrow (Undo toast both).
2. **Inbox** (purpose: capture fast, sort later). Large title with the count, collapses on scroll. Rows swipe as Today. Empty state teaches: "Tap + to capture anything".
3. **Upcoming** (purpose: see the week ahead). Large title and month; the week strip is sticky under the small bar while you scroll, and the selected day follows the scroll. Day sections with their quiet "Add task" row.
4. **Browse** (purpose: everything that is not a daily list). A search field at the top (opens the palette), a profile card row (avatar, name, email) that opens Profile, then Projects with a "New project" row, then Settings rows (Appearance). This is where Profile and settings live on a phone.
5. **Projects list / a project / Profile / its pages** are pushed pages on the phone: a small top bar with back on the left and the title, at most one action on the right (project: "more" opens a bottom action sheet with Edit and Delete). No tab add button on these pages; a project page has its own "Add task" row and the bottom add button stays because adding into a project is its main job.
6. **Task detail** (purpose: change one task). A bottom sheet, not a full screen: rises to about 92 percent height, grab handle, drag down or tap the scrim to close, delete moved into a "more" action sheet; the title, chips and progress sit in the thumb half on tall phones.
7. **Quick add** (purpose: capture in seconds). Sheet above the keyboard: title field, then one horizontal row of date chips and one of project chips (no wrapping, so it stays short above the keyboard), and the Add button at the bottom right.
8. **Row actions** on a phone: long-press opens a bottom action sheet (Open, Move to tomorrow, Delete), not a menu at the finger.
9. **Search (palette)** on a phone: a sheet from the top with the field focused; results fill the screen; same matching as the web.

The web keeps its current layout; only shared components change.

## Acceptance criteria

1. On a phone no screen shows a header that is not its own; pushed pages show back plus title only; the search icon appears only on Today (and the Browse search field).
2. Tab roots show the large title that collapses into a small sticky bar on scroll (fade and slide, reduced motion shows it at once).
3. Swipe a row right to finish, left to move to tomorrow; past 30 percent of the width it commits, otherwise it springs back; both show a toast with Undo; vertical scrolling is not hijacked. Phone only (touch); the web keeps right-click.
4. Task detail on a phone is a bottom sheet with drag to close; test ids stay.
5. Long-press on a phone opens a bottom action sheet; the web keeps the pointer menu.
6. Browse holds search, the profile card, projects with New project, and settings; Profile, Projects and a project are pushed pages with back.
7. "Done today" is folded on a phone by default and opens with a tap.
8. Upcoming's week strip stays visible while scrolling on a phone and highlights the day in view.
9. Quick add on a phone keeps chips on single scrolling rows.
10. Checks: lint, format, typecheck, unit tests, web export; screenshots at 390 wide light and dark of every screen, compared to this plan, recorded below.

## Out of scope

- Haptics and Reanimated or Gesture Handler (stage 5 with an Expo Go check). Gestures here use React Native PanResponder.
- Drag to reorder, natural language quick add, priorities (stage 3).

## Plan

1. `components/LargeHeader.tsx` (collapsing header and small bar) and `Page` support for it; remove the phone top bar from the Shell; add-button only on tab roots and project pages.
2. Swipe rows (`components/SwipeRow.tsx`), pure threshold logic in `core/swipe.ts` with tests.
3. `components/ActionSheet.tsx`; ContextMenu uses it on a phone.
4. Task detail bottom sheet with drag to close (`components/DragSheet.tsx`, shared by Sheet on phone).
5. Browse rebuild; pushed-page headers for Projects, a project, Profile.
6. Done today fold; Upcoming sticky strip and day tracking; quick add chip rows.
7. Screenshots, checks, commit.

## Progress

- [x] Spec written and approved under the human's standing instruction for the night (2026-10-03: "write the next spec and go on and complete that spec")
- [x] Page owns its header: phone bar (back, small title that fades in after the large title scrolls away, up to two actions, hairline), large title or `hero`, `sticky` slot; web unchanged. The phone's global top bar is gone; the add button shows only on Inbox, Today, Upcoming and a project
- [x] Swipe rows (`core/swipe.ts` + 4 tests, `components/useSwipe.ts`): right finishes or reopens, left moves to tomorrow, Undo on both; a press that ends a swipe does not open the task
- [x] Action sheet on a phone for long-press (`components/ActionSheet.tsx`), titled with the task
- [x] Task detail as a drag-to-close bottom sheet on a phone (`components/DragSheet.tsx`); close button on both layouts
- [x] Browse: search field, profile card, projects with New project and All projects, Appearance and About; Profile and Projects are pushed pages with back on a phone
- [x] Done today folded on a phone; empty day counts hidden; Upcoming strip pinned with a hairline and following the scroll; quick add date chips on one scrolling row on a phone; a project page drops its duplicate add icon on a phone
- [x] Floating surfaces one step lighter in dark (`raised` colour) so sheets separate from the page
- [x] Checks: lint, format, typecheck, 64 unit tests, web export
- [x] Screenshots at 390 wide, light and dark, of Today (top, scrolled, mid-swipe), Inbox, Upcoming (top, scrolled), Browse, Projects, a project, task sheet, Profile, Appearance, action sheet, quick add; and 1440 wide to check the web did not change
- [x] Review fixes (2026-10-03): the task sheet settles back if another gesture takes over, reads its height live, and closes on Android back; it stays up between a task and its subtasks; a finished task cannot be swiped left (no due date on a done task); a swipe that is sliding off cannot be grabbed again; a page keeps its back and actions on the web while its title is still empty; Upcoming measures sections when asked on the web (the web only reports size changes) and has room under the last day
- [ ] Human checks on a real phone (swipe and drag feel, keyboard over quick add)

## Notes

- Verification (2026-10-03): every criterion checked on the screenshots listed in Progress, against the plan above. 1 headers: pushed pages show back and title only; search only on Today and Browse. 2 the small title and hairline appear after scrolling Today and Upcoming. 3 the mid-swipe shot shows the Done backdrop; release short of 30% springs back without opening the task. 4 task sheet over the tab bar with handle and close. 5 action sheet from the bottom with Cancel. 6 Browse order as planned. 7 "Done today 1 >" folded. 8 strip pinned under the bar, Mon selected while Monday is at the top. 9 one chip row. Not tested: real touch on a device (Playwright drove a mouse), the software keyboard.

- Research used: Material 3 top app bar usage (two or three trailing icons, overflow beyond), Hoober's thumb zone and Osmani's touch-friendly design (bottom for frequent actions, center for primary content), Things 3 (swipe to reschedule, pull or top search, task as an object), a Todoist iOS critique (long-press versus drag ambiguity: keep long-press for actions only, no drag on rows yet).
