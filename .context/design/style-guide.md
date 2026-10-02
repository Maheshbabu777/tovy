# Tovy style guide

Status: proposed, waiting for the human's approval (accent and font still open). Source of the rendered version: the Tovy Design System artifact. Once approved this file wins over `design-spec.md` for how things look.

Tovy is a task, routine and habit app for people who plan their day inside AI apps. Claude, ChatGPT and other apps write to it through MCP, and the person checks and finishes the work in Tovy on Android and the web. The interface follows the habits of the task apps people already trust, Todoist above all: the list is the hero, rows are quiet, and adding a task takes seconds. Every rule below serves that.

## Principles

- **The list is the hero.** Screens are lists of rows under section headers. No hero cards, rings, scores or points on any list. Totals and charts live on a stats screen a person opens on purpose.
- **Show only what is set.** A row prints a date only if the task has one, a project only if it has one. Empty fields stay invisible.
- **Capture first.** The add button (phone) and Add task (web) are on every list, and quick add reads plain words.
- **One accent, used sparingly.** `accent-fill` appears on one primary button per view and the phone add button; `accent` marks selection and links. Everything else is neutral.
- **Colour means something.** Priority, date and project colours carry information, and each also comes with a word or icon.

## Voice and copy

- Sentence case everywhere: buttons, titles, menu items. Never all caps.
- Actions start with a verb: "Add task", "Reschedule", "Move to project", "Delete".
- Say what happened, plainly: "1 task completed", "Moved to Tomorrow", "Claude added 3 tasks to Inbox".
- Errors say how to fix it: "That email looks incomplete. Check for a missing @ or domain."
- Speak to the person as "you". No exclamation marks, no emoji in the interface, no jargon ("synced", "MCP") outside settings.
- Dates read like people say them: Today, Tomorrow, Thursday, 14 Oct. Times in the person's 12 or 24 hour setting.

## Colour

- Ground: `bg` for every screen. `surface` for the web sidebar and grouped backgrounds. `raised` for menus, dialogs, web sheets and the composer, always with a shadow token.
- Text: `text` for titles and task names, `text-2` for meta lines, counts and inactive icons, `text-3` only for placeholders, disabled text and done tasks.
- Lines: `border` around controls (inputs, chips, secondary buttons, the composer), `divider` between rows and under section headers. Rows are never cards.
- Accent (Cobalt): `accent-fill` with `on-accent` for the primary button and add button; `accent` for links, the selected nav item and focus; `accent-soft` for selected fills and words quick add recognised.
- Priorities: `p1` red, `p2` orange, `p3` the accent blue, no priority neutral. The check circle takes the ring colour and its `-soft` fill.
- Dates on rows and chips: `ok` for Today, `p2` for Tomorrow, `date-week` for later this week, `danger` for overdue, `text-2` for anything later.
- Projects and labels: the ten `project-*` colours, only as a `#` icon or a small dot, never behind text.
- Status: `ok` for done and success, `warn` for offline and the habit flame, `danger` for overdue, errors and delete.
- Dark theme is its own palette, not an inversion: lighter accent text, the same meanings.

## Type

- One family, Geist, at 400, 500 and 600. Geist Mono only for keyboard hints, progress percent and log timestamps.
- Phone: screen title `t-display` (26), task titles and settings rows `t-body` (15), meta `t-meta` (12), tab labels `t-micro` (11).
- Web: page title `t-title-l` (20), task titles and menu items `t-body-s` (14), section headers `t-label` (13), meta `t-meta` (12).
- Sheets and dialogs title in `t-title` (17). Inputs are at least 15px so phones do not zoom.

## Layout and spacing

- 4px base: `space-xs` 4, `space-sm` 8, `space-md` 12, `space-lg` 16, `space-xl` 24, `space-2xl` 32.
- Phone: side padding `space-lg`, rows 12px top and bottom, a 64px tab bar (`tabbar-height`) plus the safe area, 44px touch targets (`tap-min`).
- Web: a 264px collapsible sidebar (`sidebar-width`), the list column up to `content-max` 720px, side padding `space-2xl`. Task detail opens as a panel on the right or a centred dialog.
- One breakpoint at 768px. Below it the phone layout, above it the web layout.

## Shape and depth

- Radius by component: `radius-sm` 6 for chips, nav and menu items; `radius-md` 8 for buttons and inputs; `radius-lg` 12 for menus, dialogs, cards and the composer; `radius-xl` 16 for the top of a phone sheet; `radius-full` for check circles, avatars, toggles and the add button.
- Depth only where something floats: `shadow-menu` for menus and the floating composer, `shadow-dialog` for dialogs, `shadow-fab` for the phone add button. Flat surfaces get a `border` instead.

## Motion

- One curve, `cubic-bezier(0.2, 0.8, 0.2, 1)`. Hovers 150ms, menus 120ms, sheets and dialogs 200 to 250ms, completing a task 200ms (the check fills, then the row leaves).
- Gestures on phone: swipe right to complete, swipe left to reschedule, long press for the menu. A short haptic tick on complete.
- No bounce, scale-on-press or confetti. Reduce Motion shows final states at once.

## Iconography

- Phosphor, regular weight, filled for the selected tab and nav item. One icon per meaning, listed in the Icon toolkit card; screens import icons by meaning from the app's toolkit file, never from the library.
- Sizes `icon-sm` 16 (chips, meta), `icon-md` 20 (rows, buttons, menus, sidebar), `icon-lg` 24 (phone tab bar and header).
- Colour follows meaning: `text-2` at rest, `accent` selected, `danger` destructive, project colour on `#`, priority colour on the flag, `warn` on the streak flame.

## Navigation

- Phone: bottom tabs Inbox, Today, Upcoming, Browse. Browse holds projects, labels, filters, settings and connected AI apps. Search lives in the header.
- Web: sidebar with Add task, Search (Ctrl K), Inbox, Today, Upcoming, Filters and labels, then projects. Keyboard: Q add, Ctrl K search, G then T or I or U to jump.
- Inbox means captured tasks with no project, as in other task apps.

## AI changes

- Connected AI apps write directly. A task an AI app changed shows an `ai` icon and the app's name in its meta line ("Claude").
- Deletes by an AI app go to Trash for 30 days; every AI change is listed under Browse, Connected apps, Activity, with Undo.

## Accessibility

- Text pairs meet 4.5:1 in both themes (`text-3` is the exception and only carries placeholder or disabled text). Icons, borders and focus rings meet 3:1.
- Focus: a solid 2px `focus-ring` with a 2px offset on every control.
- Every icon-only button has a label. Priority and date colours always come with a word or icon.


## Tokens

### Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | #FFFFFF | #17181B | Page ground for every screen, sheets on phone, inputs. |
| `surface` | #F7F7F8 | #1E1F23 | Web sidebar, grouped settings background, hero-free panels. Never behind running text that uses `text-3`. |
| `raised` | #FFFFFF | #26272C | Menus, popovers, dialogs, web sheets and the quick add composer. Lifted with a shadow token. |
| `hover` | #F2F2F4 | #2A2B30 | Hover fill for rows, nav items and ghost buttons on web; pressed fill on phone. |
| `border` | #E5E5E8 | #313238 | Control borders (inputs, secondary buttons, chips, composer). |
| `divider` | #EEEEF0 | #26272C | Hairline between task rows and under section headers. |
| `text` | #1D1D20 | #ECECEF | Titles, task names, body. Reads on bg, surface and raised in both themes (12:1 or more). |
| `text-2` | #5E5F66 | #A6A7AE | Secondary text: meta lines, counts, descriptions, inactive icons. 5.9:1 or more on bg, surface and raised. |
| `text-3` | #8B8C93 | #7D7E86 | Placeholder, disabled and decorative text only (about 3.3:1). Never for information a user needs. |
| `accent` | #2457D6 | #6A92F7 | Cobalt. Links, selected nav item text and icon, focus ring, priority 3. Text-safe on bg, surface and raised in both themes. |
| `accent-fill` | #2457D6 | #3D6EEB | Fill of the one primary button per view and the phone add button. Text on it is `on-accent`. |
| `on-accent` | #FFFFFF | #FFFFFF | Text and icons on `accent-fill` (6.2:1 light, 4.5:1 dark). |
| `accent-soft` | #EBF0FD | #222C47 | Selected row and nav item fill, parsed words in quick add, priority 3 check fill. |
| `focus-ring` | {accent} | {accent} | 2px solid keyboard focus ring with a 2px offset. |
| `p1` | #C53A30 | #F06A5E | Priority 1 check circle and flag. |
| `p1-soft` | #FCEBEA | #3A2322 | Priority 1 check circle fill. |
| `p2` | #B4570A | #F0922E | Priority 2 check circle and flag. Also the Tomorrow date colour. |
| `p2-soft` | #FDF1E6 | #3A2A1A | Priority 2 check circle fill. |
| `p3` | {accent} | {accent} | Priority 3 check circle and flag. |
| `p3-soft` | {accent-soft} | {accent-soft} | Priority 3 check circle fill. |
| `ok` | #1B7A43 | #45B97A | Done check fill, the Today date colour, success toasts. Always with a check icon or a word. |
| `ok-soft` | #E7F4EC | #1B3326 | Success icon disc. |
| `warn` | #B45309 | #E9A23B | Offline banner icon, habit streak flame. |
| `danger` | {p1} | {p1} | Overdue dates, delete text, field errors. Always with a word. |
| `danger-fill` | #C53A30 | #C9392F | Fill of a destructive confirm button. Text on it is `on-accent`. |
| `danger-soft` | #FCEBEA | #3A2322 | Error banner fill. |
| `date-week` | #7445C8 | #A98BF0 | Date text for a day later this week (Wed, Thu). |
| `toast-bg` | #1D1D20 | #ECECEF | Toast background (inverted). |
| `on-toast` | #FFFFFF | #17181B | Toast text. |
| `toast-action` | #8FB0FF | #2457D6 | Undo text in a toast. |
| `scrim` | rgba(10, 10, 14, 0.40) | rgba(0, 0, 0, 0.60) | Behind sheets and dialogs. |
| `project-red` | #D1453B | #F06A5E | Project and label colour: red. |
| `project-orange` | #D9650B | #F0922E | Project and label colour: orange. |
| `project-yellow` | #B08700 | #E3B53A | Project and label colour: yellow. |
| `project-green` | #2E8F4C | #4FBF7C | Project and label colour: green. |
| `project-teal` | #0F857F | #2DB3A3 | Project and label colour: teal. |
| `project-sky` | #1F7FC2 | #5AB0EC | Project and label colour: sky. |
| `project-blue` | #2457D6 | #6A92F7 | Project and label colour: blue. |
| `project-violet` | #7445C8 | #A98BF0 | Project and label colour: violet. |
| `project-pink` | #C23D7A | #EE77AE | Project and label colour: pink. |
| `project-slate` | #646873 | #9A9EA8 | Project and label colour: slate. Also the Inbox. |

### Type

| Style | Size / line | Weight | Use |
|---|---|---|---|
| `t-display` | 26px / 32px | 600 | Phone screen title (Today, Inbox, a project). One per screen. |
| `t-title-l` | 20px / 28px | 600 | Web page title; task detail title. |
| `t-title` | 17px / 24px | 600 | Sheet and dialog titles. |
| `t-body` | 15px / 22px | 400 | Task titles and settings rows on phone; inputs. |
| `t-body-strong` | 15px / 22px | 500 | Buttons on phone, emphasised values. |
| `t-body-s` | 14px / 20px | 400 | Task titles and menu items on web; descriptions; dialog body. |
| `t-label` | 13px / 18px | 600 | Section headers, field labels. |
| `t-chip` | 13px / 18px | 500 | Chips, small buttons, nav items on web. |
| `t-meta` | 12px / 16px | 400 | The meta line under a task title, helper text, counts. |
| `t-micro` | 11px / 14px | 500 | Phone tab labels, badges. |
| `t-mono` | 12px / 16px | 400 | Keyboard hints, progress percent, log timestamps. Nothing else. |

### Spacing

| Token | Value | Use |
|---|---|---|
| `space-2xs` | 2px | Inside components only (badge padding). |
| `space-xs` | 4px | Icon to text in a chip, meta items. |
| `space-sm` | 8px | Gap between chips and buttons; nav item padding. |
| `space-md` | 12px | Check circle to task title; row vertical padding on phone. |
| `space-lg` | 16px | Phone page side padding; card and sheet padding. |
| `space-xl` | 24px | Gap above a section header; dialog padding. |
| `space-2xl` | 32px | Web page side padding. |
| `space-3xl` | 48px | Empty state vertical padding. |

### Radius

| Token | Value | Use |
|---|---|---|
| `radius-xs` | 4px | Keyboard keys, badges. |
| `radius-sm` | 6px | Chips, nav items, menu items. |
| `radius-md` | 8px | Buttons, inputs, icon buttons. |
| `radius-lg` | 12px | Menus, popovers, the quick add composer, cards, web sheets and dialogs. |
| `radius-xl` | 16px | Top corners of a phone bottom sheet. |
| `radius-full` | 999px | Check circles, avatars, the phone add button, toggles. |

### Size

| Token | Value | Use |
|---|---|---|
| `icon-sm` | 16px | Icons inside chips and meta lines. |
| `icon-md` | 20px | Icons in buttons, rows, menus and the web sidebar. |
| `icon-lg` | 24px | Phone tab bar and phone header icons. |
| `tap-min` | 44px | Smallest touch target on phone. |
| `check-size` | 20px | Task check circle (phone 22px). |
| `tabbar-height` | 64px | Phone bottom tab bar, plus the safe area. |
| `sidebar-width` | 264px | Web sidebar when open. |
| `content-max` | 720px | Web list column width. |

### Shadow

| Token | Light | Dark | Use |
|---|---|---|---|
| `shadow-menu` | `0 4px 16px rgba(17, 17, 26, 0.10), 0 0 0 1px rgba(17, 17, 26, 0.06)` | `0 4px 16px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.06)` | Menus, popovers, the quick add composer when floating. |
| `shadow-dialog` | `0 16px 48px rgba(17, 17, 26, 0.18)` | `0 16px 48px rgba(0, 0, 0, 0.60)` | Dialogs and web sheets. |
| `shadow-fab` | `0 6px 16px rgba(36, 87, 214, 0.30)` | `0 6px 16px rgba(0, 0, 0, 0.50)` | The phone add button only. |

## Icon toolkit (Phosphor 2.1)

| Meaning | Icon | Filled version | Use |
|---|---|---|---|
| `inbox` | `tray` | yes | Inbox tab and sidebar item |
| `today` | `calendar-check` | yes | Today tab and sidebar item |
| `upcoming` | `calendar-dots` | yes | Upcoming tab and sidebar item |
| `browse` | `squares-four` | yes | Browse tab (projects, labels, settings) |
| `search` | `magnifying-glass` | yes | Search and the command palette |
| `add` | `plus` |  | Add a task, project or section |
| `check` | `check` |  | Done, selected option |
| `close` | `x` |  | Close a sheet or dialog, dismiss a toast |
| `back` | `caret-left` |  | Back on a pushed screen |
| `forward` | `caret-right` |  | Drill in, next week |
| `expand` | `caret-down` |  | Open a group, a picker |
| `more` | `dots-three` |  | More actions |
| `date` | `calendar-blank` |  | Due date picker and chip |
| `deadline` | `target` |  | Deadline (separate from the due date) |
| `time` | `clock` |  | A time on a date |
| `reminder` | `bell` |  | Reminders and notifications |
| `repeat` | `repeat` |  | Repeating task or habit |
| `priority` | `flag` | yes | Priority picker; the filled flag takes the priority colour |
| `label` | `tag` |  | Labels |
| `project` | `hash` |  | A project, drawn in the project colour |
| `section` | `folder-simple` |  | Sections inside a project |
| `subtasks` | `list-checks` |  | Sub-task count on a row |
| `note` | `note-pencil` |  | Description or comment on a task |
| `attachment` | `paperclip` |  | Attachment |
| `progress` | `chart-donut` |  | Progress on a bigger task |
| `habit` | `arrows-clockwise` |  | Habits and routines |
| `streak` | `fire` |  | A habit's streak, drawn in `warn` |
| `ai` | `sparkle` |  | Changed by a connected AI app |
| `connected-apps` | `plugs` |  | Connected AI apps |
| `activity` | `clock-counter-clockwise` |  | Activity log of AI changes |
| `undo` | `arrow-counter-clockwise` |  | Undo |
| `edit` | `pencil-simple` |  | Edit |
| `delete` | `trash` |  | Delete, Trash |
| `drag` | `dots-six-vertical` |  | Drag handle to reorder (web) |
| `filter` | `funnel` |  | Filters |
| `sort` | `arrows-down-up` |  | Sort and view options |
| `favorite` | `star` | yes | Favourite project |
| `settings` | `gear` |  | Settings |
| `account` | `user-circle` |  | Account and profile |
| `theme-light` | `sun` |  | Light theme |
| `theme-dark` | `moon` |  | Dark theme |
| `sign-out` | `sign-out` |  | Sign out |
| `export` | `export` |  | Export data |
| `keyboard` | `keyboard` |  | Keyboard shortcuts (web) |
| `command` | `command` |  | Command palette key hint (web) |
| `help` | `question` |  | Help and feedback |
| `offline` | `cloud-slash` |  | Offline banner |
| `overdue` | `warning-circle` |  | Overdue notice |
| `sidebar` | `sidebar-simple` |  | Collapse or open the sidebar (web) |
| `arrow` | `arrow-right` |  | Go to, continue |
