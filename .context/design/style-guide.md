# Tovy style guide

Status: approved by the human on 2026-10-03 ("Perfect"). Source of truth for how Tovy looks: the Paper file `tovy`, page Design system (artboards 01 Foundations, 02 Components, 03 and 04 Phone Today light and dark, 05 Web Today). This file is the written form of that page. Where it disagrees with `design-spec.md`, this file wins. Structure and behaviour still follow the specs.

## Principles

- Black and white. The grounds are pure white and pure black; tasks and type carry the screen.
- One colour only: red, for overdue dates, delete and errors. Nothing else is coloured.
- The list is the hero. No hero cards, rings, points or scores on lists.
- Show only what is set. Empty fields print nothing.
- Big type at regular weight with tight tracking; weight 500 only for small titles, labels and buttons.
- Hairlines separate; a shadow only on what floats (menus, quick add, toast, the phone add button).

## Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| bg | #FFFFFF | #0A0A0A | Page ground, sheets, inputs |
| panel | #F6F6F6 | #141414 | Web sidebar, composer footer, grouped settings |
| hover | #EFEFEF | #1F1F1F | Hover, pressed and selected fills |
| line | #E6E6E6 | #262626 | Hairlines between rows, control borders |
| line-strong | #D4D4D4 | #3A3A3A | Progress ring track |
| text | #0A0A0A | #F5F5F5 | Titles, task names, body |
| text-2 | #5C5C5C | #A3A3A3 | Meta lines, counts, inactive icons and tabs |
| text-3 | #9A9A9A | #6B6B6B | Placeholders and done tasks only, never information |
| primary | #0A0A0A | #F5F5F5 | Primary button, add button, done check, selected tab |
| on-primary | #FFFFFF | #0A0A0A | Text and icons on primary |
| red | #D93025 | #FF6B5E | Overdue, delete, errors. Always with a word |

## Type

Geist for everything, Geist Mono for times, percentages, counts in section headers and key hints.

| Style | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| hero | 56 / 60 | 400 | -0.035em | Marketing and onboarding only |
| display | 34 / 38 (phone), 40 / 44 (web) | 400 | -0.035em | Screen title (Today, Inbox) |
| title-l | 24 / 28 | 400 | -0.02em | Task detail title |
| title | 18 / 24 | 500 | -0.01em | Sheet and dialog titles |
| body | 15 / 20 to 22 | 400 | 0 | Task titles, inputs, settings rows on phone |
| body-s | 14 / 20 | 400 | 0 | Web rows, menus, descriptions |
| label | 13 / 18 | 500 | 0 | Section headers, field labels, small buttons |
| meta | 12 / 16 | 400 | 0 | Meta line under a task |
| micro | 11 / 14 | 500 | 0 | Tab labels |
| mono | 12 / 16 | 400 | 0 | 17:00, 40%, Ctrl K |

## Space and shape

- 4px grid: 4, 8, 12, 16, 24, 32, 48, 64. Phone side padding 20, web list column 720 wide, sidebar 260.
- Radius: 6 chips and nav items, 10 fields, 12 cards, menus and the composer, 20 phone sheets, full for every button, the add button, toggles and check circles.
- Shadows: menus and composer `0 12px 32px rgba(0,0,0,0.06 to 0.08)`, toast `0 12px 32px rgba(0,0,0,0.18)`, add button `0 8px 24px rgba(0,0,0,0.20)`.

## Components (see Paper, 02 Components)

- **Buttons:** pills. Primary is solid black (white in dark), one per view; outline (line border) for Cancel; quiet text for low-weight actions; red only to confirm a delete. Heights 48 large, 40 default, 32 small; icon button 40; phone add button 56 round.
- **Task row:** 20px check, title, then one meta line only when something is set; project name at the right in text-2. No priority: thin text-3 ring. P1: 2px black ring plus a small outlined `P1` mono tag. Progress: a black arc on a line-strong track plus `40%` in mono and `2 of 5`. Habit: rounded square check and "Daily · 12 days in a row". Done: solid black circle, white check, title text-3 with a strike. AI changed: a small sparkle and the app name. Rows split by hairlines, never boxed.
- **Section header:** label in text, count in mono text-3, a hairline under it, an underlined action at the right (Reschedule).
- **Quick add:** white box with a hairline and a soft shadow. Recognised words are underlined in place. Chips under it (a set chip is filled hover, an empty one outlined). Footer on panel with the project at the left and Cancel and Add task pills at the right.
- **Fields:** label above, 44 tall, radius 10, line border; error turns the border red and puts a red sentence below.
- **Menu:** 232 wide, radius 12, hairline and soft shadow, 34 tall items, key hint in mono text-3, Delete last in red.
- **Toast:** inverted (text colour ground), 48 tall, radius 12, Undo as a translucent pill.
- **Settings:** grouped rows in a hairline box, radius 12, 52 tall rows; segmented control as a pill track; toggle black when on.
- **Navigation:** phone bottom tabs Inbox, Today, Upcoming, Browse (active in text with the filled icon, others text-2), search and more in the header, logo mark top left. Web sidebar on panel: logo and avatar, black Add task pill, Search, Inbox, Today (selected on hover fill), Upcoming, Filters and labels, then Projects with `#` in text-3.

## Icons

Phosphor, regular weight, filled only for the active tab or nav item. Sizes 13 to 16 in meta and chips, 18 to 20 in rows, menus and the sidebar, 24 in the tab bar. Screens import icons by meaning from `src/ui/icons.ts`, never from the library. The map is in the Paper Foundations page, section 04.

## Mark

The three stacked stones. Files: `assets/brand/tovy-mark-black.png` (light theme), `tovy-mark-white.png` (dark theme), `tovy-app-icon.png`. Never recoloured or redrawn. Wordmark "tovy" in Geist 600 at -0.04em to the right of the mark.

## Motion

One curve, cubic-bezier(0.2, 0.8, 0.2, 1). Hover 150ms, menus 120ms, sheets and dialogs 200 to 250ms. No bounce. Reduce motion shows final states at once.

- Route change, and moving between pages inside a tab: fade and rise 8 px, 180ms.
- Task panel: slides in from the right, 24 px on the web (220ms), 48 px on a phone (260ms).
- Menus and the command palette: pop from 0.96, 120 to 140ms. Sheets rise 24 px, 250ms. Toast rises 24 px, 250ms.
- Lists: rows fade and rise 6 px; on first show they follow each other 30ms apart (at most 240ms).
- Finishing a task: the filled check pops 0.6, 1.15, 1 over 300ms where the row lands. The save is never delayed for an animation.
- Navigation: one highlight slides behind the selected sidebar item; a 2 px bar slides over the selected phone tab, 200ms.
- Code: `src/ui/motion.ts` (`animate`, `useEnter`, `useSlideIn`, `usePop`, `useReducedMotion`).
