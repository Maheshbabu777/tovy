# Tovy: Complete Design Specification

Source: written by the human (2026-10-02) as the full design reference. It describes the finished product. Which parts are built in which phase is decided in `.context/specs/` and `.context/project-plan.md`. Where this file and a spec disagree about timing, the spec wins; where they disagree about how something looks, this file wins.

> **Who this is for:** designers and engineering agents building Tovy on any stack (Android/Compose, React, Flutter and so on).
> It is self-contained. It does not refer to any existing codebase. Every value you need is written out here.
> Units: `px` means density-independent pixels (dp on Android, CSS px on web). Colours are given as RGB and hex.

---

## 0. Product summary

**Tovy** is a local-first task and routine app with AI integration over MCP (Model Context Protocol).

- **Platforms:** Android phone first, plus a web companion. Both share one design system but differ in navigation, input and feedback (see section 6).
- **Core ideas:**
  1. **Partial progress.** A task can be 0 to 100% done. Progress earns *progress points*.
  2. **Daily ring.** Reaching **150 progress points** in a day closes the ring.
  3. **Streaks with freezes.** A day counts toward the streak when the ring closes. You get **2 freezes per month**; a missed day automatically spends one.
  4. **Heatmap.** A grid of points per day, 18 weeks wide.
  5. **AI approval inbox.** Connected AI apps (Claude, ChatGPT, others) can read your tasks and *propose* changes. Nothing is written until you approve it, unless you grant that app the "Auto-approve" permission.
- **Tone:** calm, fast, focused. Every interaction must respond in under 100ms (data is local first).
- **Demo user:** Maya Okafor, maya@okafor.studio.

### Design principles
1. **Calm.** One ink colour, one accent, generous whitespace, and no decoration that competes with tasks.
2. **Fast.** Optimistic UI everywhere; motion is short (120 to 280ms).
3. **Honest AI.** Mark anything AI-created with an "AI" badge, and show AI writes as before/after diffs.
4. **Forgiving.** Every destructive action offers Undo in a toast (5s).
5. **Sentence case everywhere.** Never use ALL CAPS labels.

---

## 1. Colour

### 1.1 Base tokens

| Token | Light RGB | Light hex | Dark RGB | Dark hex | Purpose |
|---|---|---|---|---|---|
| `bg` | 255 255 255 | `#FFFFFF` | 11 11 17 | `#0B0B11` | Page ground, sheets, dialogs, inputs |
| `surface` | 248 248 251 | `#F8F8FB` | 19 19 27 | `#13131B` | Web sidebar, hero cards, info panels |
| `ink` | 17 17 26 | `#11111A` | 238 238 248 | `#EEEEF8` | Base for **all** text, borders and neutral fills |
| `accent` | 67 56 202 | `#4338CA` | 139 141 251 | `#8B8DFB` | Primary buttons, selection, progress, links |
| `on-accent` | 255 255 255 | `#FFFFFF` | 14 14 30 | `#0E0E1E` | Text and icons on accent fills |
| `ok` | 17 122 85 | `#117A55` | 80 200 150 | `#50C896` | Done, approve, synced, completed ring |
| `warn` | 176 80 10 | `#B0500A` | 240 170 90 | `#F0AA5A` | Streak flame, offline |
| `bad` | 190 40 60 | `#BE283C` | 255 120 135 | `#FF7887` | Overdue, reject, delete, errors |

### 1.2 Ink ladder (all neutrals)

Never use grey hex values. Every neutral is the `ink` colour at an opacity.

| Name | Opacity | Use |
|---|---|---|
| `ink-1` | 4% | Quiet fills: ghost buttons, code blocks, "Before" panel, calendar pills |
| `ink-2` | 8% | Hover fill, skeleton bars, empty progress tracks, active sidebar item |
| `ink-3` | 12% | Hairline borders, dividers, input borders, card outlines |
| `ink-4` | 24% | Stronger borders, unchecked checkbox/radio, selected-day outline |
| `ink-5` | 46% | Placeholder, disabled text, chevrons, done-task title (with strikethrough) |
| `ink-6` | 68% | Secondary text, metadata, section labels, inactive icons |
| `ink-7` | 92% | Body text |
| `ink` | 100% | Headings, task titles, emphasised values |

### 1.3 Derived colours
- **accent-soft:** accent at **11%**. Used for selected chips, soft buttons, "After" diff panels, AI badges, the selected task row and step-number discs.
- **ok-soft:** ok at 15% (success icon disc). **bad-soft:** bad at 10% (sync error banner).
- **Scrim:** black at 35% behind sheets, 40% behind dialogs.
- **Celebration backdrop:** `bg` at 92% with a 4px background blur.
- **Text selection:** accent at 25%.

### 1.4 Accent options (user-selectable)

| Name | Light | Dark |
|---|---|---|
| Indigo (default) | 67 56 202 `#4338CA` | 139 141 251 `#8B8DFB` |
| Ultramarine | 36 70 212 `#2446D4` | 120 160 255 `#78A0FF` |
| Iris | 108 52 214 `#6C34D6` | 176 140 255 `#B08CFF` |

### 1.5 Project colours
`#4F46E5` indigo, `#0F8A74` teal, `#C2670E` amber, `#C0364F` rose, `#5B6B7F` slate.
Use them only as small markers: a 6px dot in meta lines, a 10px dot on project cards, or the fill of a 4px progress bar. Never put text on them.

### 1.6 Toast colours (inverted)
- **Background:** `ink` (dark in light mode, light in dark mode). **Text:** `bg`.
- **Undo text and countdown bar:** `#A5A8FF` in light mode, `accent` in dark mode.

### 1.7 Rules
- At most **one** accent-filled button per view.
- Status is **never** shown by colour alone. Always pair it with an icon or a word (for example a check icon plus "Approve", or "Yesterday" in red).
- No gradients in UI. Allowed exceptions: the logo, the slider fill, and the fade-up behind the phone quick-add bar.

---

## 2. Typography

- **Interface font:** **Geist** (weights 400, 500, 600; 300 to 700 available).
- **Data font:** **Geist Mono** (400, 500). Use it **only** for MCP URLs, keyboard keys, timestamps in logs, percentages, point values, version numbers and step numbers.
- **Source:** Google Fonts. Font features on: `ss01` (stylistic set) and `tnum` (tabular numbers, so counters don't shift).
- Weights used: **400** regular, **500** medium, **600** semibold. Do not use 700 in the UI.

| Style | Size | Line-height | Weight | Letter-spacing | Used for |
|---|---|---|---|---|---|
| Hero number | 64 | 1.0 | 600 | -0.05em | Streak count |
| Display XL | 40 | 1.0 | 600 | -0.025em | Splash wordmark |
| Display | 32 | 1.05 | 600 | -0.025em | Welcome / login titles |
| Celebration | 34 | 1.0 | 600 | -0.025em | "Ring closed" |
| H1 large | 30 | 1.0 to 1.2 | 600 | -0.025em | Today greeting, onboarding titles, OTP title |
| H1 | 24 | 1.2 | 600 | -0.025em | Task detail title, consent title |
| Page title | 22 | 1.2 | 600 | -0.025em | Top bar title on every inner page |
| Number L | 22 to 24 | 1.0 | 600 | 0 | Ring percentage, "best" streak |
| Input hero | 20 | 1.3 | 500 | 0 | Quick add input |
| H3 | 19 | 1.3 | 600 | 0 | Name in profile, diff sheet title |
| Title | 17 to 18 | 1.3 | 600 | 0 | Sheet / dialog titles, ring card headline |
| Body L | 16 | 1.6 | 400 | 0 | Onboarding copy, all text inputs |
| Body | 15 | 1.4 | 400/500 | 0 | Task titles (500), settings rows, buttons (500) |
| Body S | 14 to 14.5 | 1.5 | 400 | 0 | Descriptions, dialog body, log entries, empty-state body |
| Label | 13 | 1.4 | 500 | 0 | Section headers, chips, small buttons, subtitles, errors |
| Meta | 12 to 12.5 | 1.4 | 400 | 0 | Task meta lines, timestamps, helper text |
| Micro | 11 | 1.2 | 500 | 0 | Tab bar labels, AI badge, heatmap legend, badges |
| Mono S | 12 to 13 | 1.4 | 400 | 0 | URLs, timestamps, `pts` |
| Mono XS | 10 to 11 | 1.2 | 400 | 0 | Keyboard hints (`Cmd K`, `N`) |

**Text inputs are always 16px minimum** so Android and iOS browsers don't zoom on focus.

---

## 3. Layout tokens

### 3.1 Spacing (4px base)
`0, 4, 8, 12, 16, 24, 32, 48, 64`. Half steps of 2, 6 and 10 are allowed only inside components.

| Context | Phone | Web |
|---|---|---|
| Page side padding | 12 to 16 | 24 (settings) / 24 to 32 (streak) |
| Section gap | 24 | 24 |
| Label to content | 8 | 8 |
| Card padding | 16 to 20 | 20 |
| Dialog padding | 24 | 24 |
| Sheet padding | 20 sides, 12 top | same |
| Bottom space reserved for the tab bar | 96 | 48 |

### 3.2 Content widths (web)
- Today, Inbox, Projects, Streak: max **672**.
- Settings pages (Profile and its sub-pages): max **576**.
- Calendar: max **1024**.
- Onboarding and auth: max **448**, centred.
- Task detail side panel: **420** fixed.
- Consent card: max **448**.
- Dialog: max **384**. Sheet on web: max **512** (palette **640**).

### 3.3 Radius

| Token | Value | Use |
|---|---|---|
| `r-xs` | 4 | Heatmap cells (3px in the legend) |
| `r-sm` | 6 | Badges, kbd keys, calendar pills, subtask checkbox, skeleton bars |
| `r-md` | 10 | Buttons, inputs, icon buttons, menu items, OTP cells, banners, segmented track |
| `r-seg` | 8 | Selected segment inside a segmented control |
| `r-lg` | 14 | Cards, approval rows, task rows (hover shape), project cards, menus, toast, prompt cards |
| `r-xl` | 22 | Hero cards, setting groups, dialogs, sheets (top corners only on phone), welcome illustration |
| `full` | 999 | Chips, toggles, avatars, progress rings, dots, tab badges |

Do **not** round dividers or rows inside a grouped list. The group clips them.

### 3.4 Elevation

| Level | Value | Use |
|---|---|---|
| Flat | none + 1px `ink-3` ring | Default for all cards |
| Lift | `0 1px 2px ink/8%, 0 4px 12px -4px ink/14%` | Button hover |
| Raised S | `0 1px 2px rgba(0,0,0,.05)` | Selected segment, quick-add bar |
| Menu | `0 10px 30px rgba(0,0,0,.15)` | Context menu, toast |
| Overlay | `0 25px 50px -12px rgba(0,0,0,.25)` | Sheets, dialogs |

### 3.5 Breakpoint
- **Phone:** width < 768. **Web:** width >= 768. One breakpoint only.
- The project card grid goes to 2 columns at >= 640.

### 3.6 Touch targets
- Icon buttons 40x40, setting rows >= 56 tall, default buttons 44 tall, tab bar 64 tall, menu items 36 tall (web only).

---

## 4. Motion

- **Easing (the only curve):** `cubic-bezier(0.2, 0.8, 0.2, 1)`. Fast out, soft settle.
- **No** bounce, spring overshoot, rotation or scale-on-press on buttons.

| Event | Animation | Duration |
|---|---|---|
| Hover on a button | Translate Y -1px + Lift shadow | 150ms |
| Hover on a row/icon | Background to `ink-1`/`ink-2` | 150ms |
| Route change | Opacity 0 to 1 | 180ms |
| Bottom sheet open | Translate Y 24px to 0 + fade | 280ms |
| Task detail open (phone) | Same as sheet | 250ms |
| Dialog open | Scale 0.94 to 1 + fade | 200ms |
| Context menu | Scale 0.94 to 1 + fade | 120ms |
| Scrim | Fade | 200ms |
| Theme switch | Cross-fade background, text, border, fill, stroke and shadow together | 220ms |
| Progress ring | Stroke offset | 500ms ease-out |
| Sidebar collapse | Width 240 to 68 | 200ms |
| Toast | Rises 24px + fade; countdown bar drains left to right over **5s** linear | 250ms |
| Skeleton | Opacity pulse 1 to 0.5 to 1 | 1.4s loop |
| Splash | Logo scale 0.94 to 1 + fade | 500ms, then auto-advance at 1.1s |
| Welcome dots | Active dot width 6 to 24 | 200ms |
| **Celebration** (the only expressive moment) | 16 dots burst outward 150px, alternating accent/ok, staggered 0/40/80/120ms; check icon pops in at 150ms delay | 900ms |

**Reduced motion:** applies when the OS setting is on *or* the in-app "Reduce motion" toggle is on. All durations become about 0ms (final states appear instantly), smooth scrolling is off, and the theme cross-fade is skipped.

---

## 5. Iconography

- **Style:** outline. 24x24 grid, **1.75 stroke**, round caps and joins, current text colour. Active tab icon uses a 2.1 stroke.
- **Sizes:** 13 to 14 inside chips and meta lines, 16 in menus and small buttons, 18 in buttons, 19 to 20 in rows and the sidebar, 22 in the tab bar, 24 in empty states, 44 to 56 on hero/celebration.
- **One meaning per icon:**

| Icon | Meaning |
|---|---|
| `today` (circle with check) | Today tab |
| `inbox` (tray) | Inbox tab |
| `projects` (folder) | Projects tab |
| `profile` (person) | Profile tab |
| `plus` | Add / new |
| `calendar` | Date, Calendar |
| `flame` | Streak, priority |
| `search` | Search (opens palette) |
| `left` chevron | Back, previous |
| `right` chevron | Drill-in, forward, next |
| `x` | Close, reject, dismiss |
| `check` | Done, approve, allowed |
| `spark` (4-point star) | AI write |
| `bell` | Reminder, notifications |
| `sun` | Appearance; also the **freeze** token |
| `moon` | Dark mode |
| `copy` | Copy to clipboard |
| `link` | Connected apps |
| `trash` | Delete |
| `download` | Export |
| `logout` | Sign out |
| `activity` (pulse line) | Activity feed |
| `command` | Command palette |
| `dots` | More |
| `repeat` | Recurrence |
| `clip` | Attachment |
| `shield` | Privacy / about |
| `keyboard` | Shortcuts |
| `cloud` | Sync |
| `sidebar` | Collapse sidebar |

---

## 6. Platforms: phone vs web

| Aspect | Phone (Android) | Web companion |
|---|---|---|
| Primary nav | **Bottom tab bar**: Today, Inbox, Projects, Profile | **Left sidebar**, collapsible 240 to 68 |
| Secondary nav | Icon buttons in the Today header (search, calendar, streak) | Sidebar footer: Calendar, Streak, Collapse |
| Add task | Sticky **quick bar** pinned above the tab bar on Today, opens the Quick add **bottom sheet** | Quick bar at the top of Today, accent "Quick add" button (Cmd K) in the sidebar, `N` key |
| Task detail | **Full-screen** page sliding up, with a back chevron | **420px right panel** next to the list, with an x close button |
| Approvals | **Swipe** right = approve, left = reject (90px threshold); tap = details | Inline **Reject / Approve** buttons on each row; mouse swipe disabled |
| Context menu | Long-press | Right-click (custom menu) |
| Sheets | Bottom sheet, grab handle, top radius 22, max 88% height | Centred modal at 14% from top, x close, Esc |
| Haptics | Yes (toggle in Preferences) | **None**, and no setting shown |
| Notifications | System notifications | Browser notifications ("Allow browser notifications") |
| Keyboard | none | Shortcuts (6.1); "Keyboard shortcuts, Press ?" row in Profile |
| Calendar cells | Up to 3 accent **dots** per day | Task **pills** inside each day; drag and drop to reschedule |
| Hover states | None | All rows, buttons and cards |

**Haptic patterns (phone only):**

| Event | Pattern (ms) |
|---|---|
| Light tap (add, check subtask) | 12 |
| Progress logged | 10 |
| Task reaches 100% | 25 |
| Approve | 18 |
| Ring closed | 20, pause 40, 30 |

### 6.1 Web keyboard shortcuts
`Cmd K` / `Ctrl K` palette, `N` new task, `T` Today, `I` Inbox, `P` Projects, `C` Calendar, `S` Streak, `D` toggle dark, `?` shortcuts, `Esc` close, right-click for the task menu.
Shortcuts are ignored while typing in an input.

---

## 7. Components

Each component lists **anatomy, sizes, states, behaviour**.

### 7.1 Button
- **Anatomy:** optional leading icon (18, or 14 when small) + label, with a gap of 8.
- **Sizes:**
  - Default: height 44, horizontal padding 20, 15px/500.
  - Small: height 32, horizontal padding 12, 13px/500.
  - Radius 10 for both.
- **Variants:**
  - **Primary:** accent fill, on-accent text. Hover is 90% opacity plus lift.
  - **Soft:** accent-soft fill, accent text. Hover takes the fill to accent 15%.
  - **Ghost:** ink-1 fill, ink-7 text. Hover goes to ink-2. A bordered ghost (1px ink-3) is used for "Continue with Google".
  - **Danger:** bad fill, `bg` text.
- **States:**
  - Hover: -1px lift + Lift shadow.
  - Pressed: returns to 0 and the shadow goes.
  - Focus: 2px accent ring with a 2px offset.
  - Disabled: 40% opacity and not clickable. Avoid disabling buttons on forms; validate on submit instead.

### 7.2 Icon button
40x40, radius 10, icon 20 in ink-6. Hover: ink-2 fill and the icon goes to ink. It **must** have an accessible label (tooltip on web).

### 7.3 Chip
- **Size and shape:** height 32, pill, 1px ink-3 border, horizontal padding 12, 13px/500, optional 14px leading icon with a gap of 6.
- **Active:** accent border, accent-soft fill, accent text.
- **Colour variant:** a leading 6px dot in a project colour.
- Clickable chips get an ink-1 hover fill.

### 7.4 AI badge
- Height 18, radius 6, horizontal padding 6, accent-soft fill, accent text, 11px/500, with a small spark icon and the text "AI".
- It may show the app name ("Claude").
- It appears on any AI-created task, log entry or activity.

### 7.5 Toggle (switch)
- Track 48x28, pill. **On:** accent. **Off:** ink-3.
- Knob 24x24 in `bg` with a small shadow, inset 2px. It slides 20px when on.

### 7.6 Segmented control
- Track: ink-1 fill, radius 10, padding 2.
- Segments: height 32, horizontal padding 14, 13px/500.
  - Selected: `bg` fill, radius 8, Raised S shadow, ink text.
  - Unselected: ink-6, going to ink on hover.
- Used for theme (Light / Dark / System), calendar mode (Week / Month), week start (Mon / Sun), and connect guide (Claude / ChatGPT / Other).

### 7.7 Slider (progress)
- **Track:** height 6, pill. Filled part is accent; the rest is ink-2.
- **Thumb:** 22px circle with a `bg` fill, a 2px accent border and a soft shadow.
- **Behaviour:** step 5. The value updates live while dragging. It **commits a log entry on release** (pointer up or key up).

### 7.8 Progress ring
- **Anatomy:** a track circle (ink-2) and a progress arc (accent) starting at 12 o'clock, clockwise, with round caps.
- **Done:** arc turns `ok`, and small rings show a check inside.

| Context | Diameter | Stroke |
|---|---|---|
| Task row checkbox | 26 | 3 |
| Task detail | 72 | 7 |
| Today hero | 88 | 8 |
| Welcome slide | 120 | 12 |
| Celebration | 140 | 10 |

### 7.9 Checkbox (subtask)
20x20, radius 6, 1.5px border.
- **Unchecked:** ink-4 border.
- **Checked:** accent fill and border, with an on-accent check (13px, 3 stroke). The label gets ink-5 and a strikethrough.

### 7.10 Radio (permission picker)
20px circle, 1.5px border.
- **Off:** ink-4.
- **On:** accent border plus a 10px accent dot.

### 7.11 Text input
- **Size:** height 48 (40 for the compact note field, 44 in dialogs), radius 10, 1px ink-3 border, `bg` fill, horizontal padding 16, 16px text, ink-5 placeholder.
- **Focus:** border goes to accent. No size change, no glow, no animation.
- **Error:** border goes to bad. A 13px bad message sits **6px below the field**.
  - The message clears as soon as the user types.
  - The field is marked invalid for screen readers and the message is announced.
- **Label:** always visible above the field, 13px/500 ink, with 6px between label and field.
- **Borderless hero inputs** (Quick add, Task title, palette) have no border and transparent background: 20/24/16px.

### 7.12 OTP input
- **Cells:** six cells in a row, each 56 tall and flexible width, gap 8, radius 10, 1px border, 24px/600 digits.
- **Next empty cell:** accent border.
- **Error:** all cells get a bad border and bad digits.
- One hidden numeric input captures typing; tapping any cell focuses it.

### 7.13 Top bar (inner pages)
- **Layout:** minimum height 56, respects the status bar safe area.
- **Back:** a back chevron icon button on the left (only on pushed pages).
- **Title:** 22/600, truncates.
- **Optional subtitle:** 13px ink-6.
- **Right slot:** actions.

### 7.14 Task row
```
[ring 26]  Title (15/500, ink)                          [42%]
           Today, 5 PM . dot Work . [AI Claude]
```
- **Shape and spacing:** padding 12 horizontal, 10 vertical, radius 14, gap 12.
- **Hover (web):** ink-1. **Selected** (open in the side panel): accent-soft.
- **Meta line:** 12.5px ink-6, gap 8.
  - **Normal task:** due label (red if overdue), project dot and name, AI badge.
  - **Routine:** flame icon (warn) + "N day streak".
- **Right side:** a mono 12px percentage when the task is partly done (0 < p < 100).
- **Done:** the ring turns ok with a check, and the title goes to ink-5 with a strikethrough.
- **Tapping the ring:** a quick task toggles done/undone (logging +remaining or -100); a routine is checked for today.
- **Tapping the text:** opens task detail.
- **Due labels:** "Today", "Tomorrow", "Yesterday", otherwise "Wed 8 Oct". With a time: "Today, 5 PM". No date: "No date".

### 7.15 Section header
13px/500 ink-6 title, then the count in ink-5, gap 8, padding 12 horizontal, 24 above and 4 below. **Hide the section when its count is 0.**

### 7.16 Settings group and row
- **Group:**
  - Optional title (13/500 ink-6, 4px inset, 8 below).
  - A container with a 1px ink-3 outline, radius 22, clipped corners, 1px ink-3 dividers between rows.
- **Row:**
  - Minimum height 56, horizontal padding 16, gap 12.
  - Layout: optional 19px icon (ink-6), label 15px ink (flex), optional value 14px ink-6, then either a trailing control **or** a right chevron (16, ink-5) when tappable.
  - Hover: ink-1. **Danger row:** bad text and icon.

### 7.17 Card
- Standard: radius 14, 1px ink-3 outline, padding 16. Interactive cards get an ink-1 hover.
- **Hero card:** surface fill, radius 22, 1px ink-3 outline, padding 20.

### 7.18 Bottom sheet / modal
- **Phone:**
  - Anchored to the bottom, full width, top radius 22, max height 88%.
  - Grab handle: 36x4 pill in ink-3, 8 from the top.
  - Bottom padding: at least 16 or the safe area.
- **Web:**
  - Centred, 14% from the top, width 512 (palette 640), radius 22, no handle.
  - An x icon button sits in the header.
- **Header:** title 17/600, padding 20 sides, 12 top.
- **Closing:** tap the scrim or press Esc.

### 7.19 Dialog (confirm)
- **Layout:** centred, max width 384, padding 24, radius 22, Overlay shadow, 40% scrim.
- **Content:** title 18/600, body 14px ink-6 (relaxed line height), then 24px gap before the right-aligned buttons.
- **Buttons:** Cancel (ghost) and Confirm (primary, or danger if destructive), gap 8.

### 7.20 Context menu (web right-click / phone long-press)
- **Container:** width 208, padding 4, radius 14, 1px ink-3 border, `bg` fill, Menu shadow. Opens at the pointer and is clamped inside the viewport.
- **Items:** height 36, radius 10, 16px icon + 14px label, gap 10, ink-2 hover.
- **Contents:** Open, Log +10%, Move to tomorrow, Delete (bad).

### 7.21 Toast
- **Position:** bottom centre. Phone: 84 from the bottom (above the tab bar). Web: 24 from the bottom.
- **Container:** minimum height 48, radius 14, ink background, `bg` text 14px, Menu shadow.
- **Actions:** optional **Undo** text button (600, height 36) and an x dismiss button (36).
- **Countdown:** a 2px countdown bar along the bottom edge drains over 5s, then the toast disappears.
- **Messages:** "Added "Call mum" . Tomorrow, 5 PM", "Done: Draft API doc", "Task deleted [Undo]", "Approved", "Rejected [Undo]", "MCP URL copied", "Copied", "Claude connected", "Claude revoked".

### 7.22 Empty state
Centred, max width 320, padding 64 vertical.
- 56px circle in ink-1 with a 24px ink-6 icon.
- 16px gap, then the title (17/500 ink).
- 4px gap, then the body (14px ink-6, relaxed line height).
- Optional action button 20px below.

### 7.23 Skeleton
Rows of a 24px circle plus two bars (14px tall at 60 to 90% width, and 10px tall at 33% width), in ink-2 and ink-1, pulsing. Show it **only on first load** (about 450ms), and never again once data is shown.

### 7.24 Banner (sync)
Radius 10, padding 8x12, 13px, with a 16px cloud icon.
- **Offline:** ink-1 fill, ink-7 text: "Offline. Changes are saved on this device and sync later."
- **Error:** bad-soft fill, bad text: "Sync failed. Your data is safe locally."

### 7.25 Avatar / app mark
- **Avatar:** circle, accent fill, on-accent initials (2 letters, 40% of the size, 500).
- **App mark:** rounded square (radius 10), ink-1 fill, 1px ink-3 border, first letter of the app name (600, 42% of the size). Sizes 24, 36 and 48.

### 7.26 Keyboard key (web)
Radius 6, 1px ink-3 border, horizontal padding 6, Geist Mono 11px ink-6. On the accent button: white at 20% fill, 10px.

### 7.27 Quick bar
- **Shape:** height 48, radius 14, 1px ink-3 border (ink-4 on hover), `bg` fill, Raised S shadow, padding 16.
- **Contents:** an 18px accent plus icon, then the placeholder "Add a task... "call mum tomorrow 5pm"" (15px ink-5), with an `N` key hint on web.
- **On phone** it sits in a sticky footer with a fade from `bg` up to transparent behind it.

### 7.28 Heatmap cell
- **Cell:** 18x18 on phone, 20x20 on web, radius 4, 3px gap. Columns are weeks (18) and rows are days (Mon to Sun).
- **Levels:**

| Level | Rule | Fill |
|---|---|---|
| 0 | 0 points | ink-1 |
| 1 | 1 to 39 points | accent 20% |
| 2 | 40 to 89 points | accent 40% |
| 3 | 90 to 149 points | accent 70% |
| 4 | 150+ points (ring closed) | accent 100% |

- Future days are invisible. The selected cell gets a 2px ink ring.
- **Legend:** "Less [5 cells] More", 12px cells, 11px ink-6, right-aligned.

### 7.29 Freeze token
24px circle with a 13px sun icon.
- **Available:** accent-soft fill, accent icon, accent 40% ring.
- **Used:** 1px ink-3 ring only.

---

## 8. Brand

- **Logo mark:** three stacked rounded "pebbles", from top to bottom: a small circle (head), a wide flattened oval (middle) and the widest oval (base). Each has a diagonal two-stop gradient. The mark sits on a soft square tile. (The file is `assets/brand/tovy-logo.png`.)
  - **Light:** tile `#EEEAFF`; head `#BCAEFF to #A28CFB`; middle `#9A8CF5 to #6A5ED6`; base `#3B3A92 to #5250B8`.
  - **Dark:** tile `#211F45`; head `#C9BEFF to #B09DFF`; middle `#A99CFF to #7E72E6`; base `#6360D0 to #7F7CF0`.
  - **Tile radius:** 27% of the tile size.
  - **Sizes in use:** 28 (sidebar), 32 (welcome header), 44 (login), 48 (consent), 56 (about), 96 (splash).
- **Wordmark:** "tovy" in lowercase, Geist 600, tight tracking, ink colour. Always placed beside or under the mark. Sizes: 22 in the sidebar, 24 on About, 40 on the splash.
- **Clear space:** at least 1/4 of the mark size on every side. Never recolour, rotate, outline or add shadow.

---

## 9. Accessibility

- **Focus:** a visible 2px accent outline with a 2px offset on **every** interactive element when focused by keyboard.
- **Contrast:** body text (ink-7) and secondary text (ink-6) meet WCAG AA on `bg` and `surface` in both themes. Use ink-5 only for placeholder, disabled or decorative text.
- **Semantics:**
  - The active nav item is marked as the current page.
  - Toggles are switches; segmented controls are tabs; permission options are radios.
  - Sheets and dialogs are modal with an accessible name; Esc closes them.
  - Toasts are polite live status messages; form errors are alerts linked to their field.
- **Labels:** every icon-only button has a label ("Search", "Calendar", "Streak", "Back", "Close", "Delete task", "New project", "Dismiss", "Toggle sidebar").
- **Heatmap:** each cell's label reads "Wed Oct 8 2026: 120 points".
- **Scrolling:** scrollbars may be visually hidden but scrolling must still work. Prevent horizontal page overflow.

---

## 10. Voice and copy

- Sentence case for everything, including buttons and titles.
- Lead with a verb on actions: "Add task", "Email me a code", "Approve all", "Start export", "Revoke access".
- Errors say what to do next: "Add your email address to continue." / "That email looks incomplete. Check for a missing @ or domain." / "That code is wrong. Try again." / "That code expired. Request a new one."
- Reassure about data: "Your data stays on this device.", "Your data is safe locally."
- Don't use exclamation marks, emoji or jargon ("MCP" appears only in technical spots).

---

## 11. Screens

Each screen spec lists **purpose, layout (phone, then web), content, states, interactions**.
Every screen must work in **light and dark**.

### 11.0 App shell

**Phone**
```
+-----------------------------+
| (status bar / safe area)    |
|                             |
|        screen content       |
|                             |
|  [ + Add a task...      ]   |  quick bar (Today only)
+-----------------------------+
|  Today  Inbox(3) Projects Profile   tab bar 64 + safe area
+-----------------------------+
```
- **Tab bar:** `bg` at 95% with a background blur, 1px ink-3 top border, four equal tabs.
- **Each tab:** 22px icon + 11px/500 label, gap 2.
  - Active: accent icon and label, icon stroke 2.1.
  - Inactive: ink-6.
- **Inbox badge:** accent pill (16 tall, min width 16, 10px on-accent text) at the icon's top right, showing the pending approval count. Hidden at 0.

**Web**
```
+------------+------------------------------+---------------+
| logo tovy  |                              | Task detail   |
|[+Quick add Cmd K]                         | panel 420     |
|  Today   T |       main content           | (when open)   |
|  Inbox 3 I |                              |               |
|  Projects P|                              |               |
|  Profile   |                              |               |
|            |                              |               |
|  Calendar  |                              |               |
|  Streak    |                              |               |
|  Collapse  |                              |               |
+------------+------------------------------+---------------+
```
- **Sidebar container:** surface fill, 1px ink-3 right border, padding 16 top and bottom.
  - Width 240 with 12px side padding. **Collapsed:** width 68 with 8px side padding, icons only, centred, with a tooltip on each.
- **Header:** logo 28 + wordmark 22, gap 10, 20 below.
- **Quick add button:** height 40, accent fill, radius 10, plus icon 18, "Quick add" 14/500, Cmd K key on the right. 12 below.
- **Nav items:** height 40, radius 10, 19px icon, 14.5/500 label, mono shortcut letter on the right in ink-5.
  - Active: ink-2 fill, ink text.
  - Inactive: ink-6, with an ink-1 hover.
  - Inbox count badge: 18px accent pill, 11px. When collapsed it sits at the icon's top right.
- **Footer** (pinned to the bottom): Calendar and Streak (14px ink-6), then "Collapse" (13px ink-5) with the sidebar icon.
- **Main area:** scrolls on its own; content fades in on every route change.

---

### 11.1 Splash
- **Purpose:** shown while the local database opens.
- **Layout:** full screen, `bg`, everything centred. Logo at 96 with the wordmark at 40 below it, gap 16.
- **Motion:** scale and fade in over 500ms, then auto-advance to Welcome after **1.1s**.

### 11.2 Welcome (3 slides)
- **Layout:** centred column, max width 448, padding 24 sides, 40 top and bottom.
  - **Top row:** logo 32 on the left, "Skip" (14px ink-6) on the right, which goes to Login.
  - **Illustration panel:** height 208, surface fill, radius 22, 1px ink-3 outline, 40 below.
  - **Title:** 32/600 tight. **Body:** 16px ink-6, relaxed line height, 12 below the title.
  - **Bottom row:** page dots on the left (active is 24x6 accent, inactive is 6x6 ink-3, gap 6) and a primary button on the right: "Next", or "Get started" on the last slide.
- **Slides:**
  1. "Progress, not just ticks". *Log how far a task really got. A 40% day still counts toward your ring.* Illustration: progress ring 120/12 at 40%, with "40%" 28/600 in the centre.
  2. "Streaks that forgive". *Miss a day and a freeze covers you. Two a month, no guilt.* Illustration: seven 36px rounded squares (radius 10).
     - Six are accent-filled with a check.
     - The fourth is a freeze: accent-soft, accent 40% ring, sun icon.
  3. "AI that asks first". *Claude and ChatGPT can add tasks through MCP. Nothing lands until you approve it.* Illustration: a 224px mini card (`bg`, radius 14, ink-3 outline).
     - "Claude proposes" in 12/500 accent, then "Draft API doc" in 14/500.
     - Mini Reject (ink-1) and Approve (accent) buttons.

### 11.3 Login / Register (one combined screen)
```
(logo 44)

Welcome to Tovy                     32/600
New or returning, it is the same step.
We create your account if needed.   15 ink-6

[ G  Continue with Google ]         ghost + border, full width

------------ or ------------        12 ink-5, ink-3 lines

Email                               13/500 label
[ you@example.com            ]      48 input
That email looks incomplete...      13 bad (only on error)
[      Email me a code       ]      primary, full width

By continuing you accept the Terms and Privacy Policy.   12 ink-6, centred
```
- **Layout:** same centred column as Welcome, content vertically centred.
- **Spacing:** Google button 32 below the subtitle; divider 20 above and below; primary button 12 below the field; legal line 24 below the button.
- **Validation on submit** (the button is never disabled):
  - Empty: "Add your email address to continue."
  - Invalid: "That email looks incomplete. Check for a missing @ or domain."
  - The error clears on typing. Valid input goes to OTP.
- The Google button continues straight to onboarding.

### 11.4 Email code (OTP)
- **Back:** a "Back" text button at the top left (14px ink-6, chevron 16).
- **Title:** "Check your email" 30/600. **Body:** "We sent a 6-digit code to **maya@...**." (15 ink-6, email in ink and bold).
- **Code cells:** six OTP cells 32 below.
- **Error line:** 12 below the cells, 14px bad: "That code is wrong. Try again." or "That code expired. Request a new one."
- **Resend link:** 24 below, 14/500 accent: "Resend code". While disabled it reads "Resend code in 23s" in ink-5, counting down from 30s.
- **Behaviour:**
  - The code submits automatically on the 6th digit.
  - On error, the cells turn bad. Typing again clears the error.
  - Resending resets the timer and clears the cells.

### 11.5 Onboarding (4 steps)
- **Top:** a segmented progress bar of 4 bars, each 4 tall, pill, gap 6. Done and current bars are accent; future bars are ink-2.
- **Middle:** content vertically centred, title 30/600.
- **Bottom row:** a ghost button on the left ("Skip", or "Not now" on steps 2 to 3) and a primary button on the right ("Continue", or "Finish" / "Add and finish" on the last step).
- **Steps:**
  1. **What Tovy is:** "Tovy is a calm place for tasks and routines. It lives on your device first, so every tap is instant, and syncs when it can." (16 ink-6, relaxed line height)
  2. **Stay on time:**
     - Phone copy: "Allow notifications for reminders and for AI approval requests. You can change this any time." with the button **"Allow notifications"** (bell icon).
     - Web copy: "Let this browser show reminders and AI approval requests while Tovy is open in a tab. Your phone keeps its own setting." with the button **"Allow browser notifications"**.
  3. **Connect an AI app:** "Paste a Tovy address into Claude or ChatGPT to let them add tasks. Each one waits for your approval." Below it, a code block (ink-1, radius 14, padding 12, mono 12.5 ink, breaks anywhere) showing `https://mcp.tovy.app/v1/u/maya-7Fq2kX9`.
  4. **Your first task:** "Try typing a date in words." Below it, a 48px input with the placeholder "call mum tomorrow 5pm". Finishing with text creates the task.

### 11.6 Today (home)
```
[ + Add a task... "call mum tomorrow 5pm"     N ]    web only, top

Wed 1 Oct                                 search calendar streak    13/500 ink-6 + 3 icon buttons
Good morning, Maya                                  30/600

(offline / error banner if not synced)

+----------------------------------------------+
| ( 62 % )   93 points to close                |  hero card
|  ring 88   57 of 150 progress points today.  |
|            Partial progress counts.          |
|            flame 14 day streak . 2 freezes left
+----------------------------------------------+

Routines 2
 ( )  Morning pages            flame 14 day streak . dot Personal
Due today 3
 ( )  Call mum                 Today, 5 PM . dot Personal
 (/)  Draft API doc      42%   Today . dot Work . [AI Claude]
In progress 1
 (/)  Onboarding flow    65%   Fri 3 Oct . dot Design

[ + Add a task...                             ]    phone sticky
```
- **Greeting by time:** before 12:00 "Good morning", before 18:00 "Good afternoon", otherwise "Good evening".
- **Header icons:**
  - Search opens the command palette.
  - Calendar opens Calendar.
  - Flame opens Streak.
- **Hero card:** surface fill, radius 22, padding 20, gap 20. Tapping it opens Streak.
  - **Ring:** 88/8 showing the percentage of 150 points (number 22/600, "%" mono 10 ink-6 below).
  - **Headline** (17/600): "N points to close", or "Ring closed" when it reaches 150.
  - **Sub:** "57 of 150 progress points today. Partial progress counts." (13.5 ink-6)
  - **Streak line:** flame (warn) + "14 day streak . 2 freezes left" (13/500 ink).
- **Sections, in order:** Routines, Due today, In progress (tasks with 0 < p < 100 not due today). Empty sections are hidden.
- **States:**
  - Loading: skeleton (5 rows).
  - Empty: icon `today`, "A clear day", "Nothing scheduled. Add a task or let an AI app propose one."
- **Interactions:**
  - Ring tap: complete or reopen.
  - Row tap: task detail.
  - Right-click or long-press: context menu.
  - Reaching 150 points: **Celebration** after 250ms.

### 11.7 Quick add (sheet)
- **Title:** "New task".
- **Input:** a borderless 20/500 input, auto-focused, placeholder "call mum tomorrow 5pm".
- **Parsed chips** (they update live as you type):
  - `calendar` "Date" (when a date is parsed it becomes active and shows e.g. "Tomorrow, 5 PM").
  - `bell` "Time" (active when a time is parsed, e.g. "5 PM").
  - `flame` "Priority" (manual toggle).
- **Project chips:** a horizontally scrolling row (Inbox, Work, Personal, Design...). Only one is active.
- **Footer:** the helper "Dates are read from your words." (12.5 ink-6) on the left and the primary "Add task" button on the right, disabled until there is a title.
- **Parsing rules:**
  - Time: `5pm`, `5:30 pm`.
  - Relative day: `today` / `tomorrow`.
  - Weekday names (next occurrence).
  - `in N days`.
  - The matched words are removed from the title.
- **Submitting:** Enter adds the task and shows the toast "Added "Call mum" . Tomorrow, 5 PM".

### 11.8 Command palette (web, also reachable on phone via search)
- **Layout:** wide sheet (640).
- **Input row:** command icon 18 ink-5 + borderless 16px input, placeholder "Type a command, or a task to add". A 1px ink-3 divider sits below it.
- **Commands** (each row: height 44, radius 10, 17px ink-6 icon + 15px label, key hint on the right):
  - Go to Today `T`, Go to Inbox `I`, Go to Projects `P`
  - Open calendar `C`, Open streak `S`
  - Toggle dark mode `D`, Keyboard shortcuts `?`
- **Filtering:** typing filters the list, and the first match gets an ink-1 highlight. Enter runs it.
- **Adding a task:** if nothing matches, an accent-soft row reads "+ Add "{title}"" with the parsed date on the right. Enter adds it.
- **Shortcuts view:** a 2-column grid of label + key pairs (N New task, Cmd K Command palette, T, I, P, C, S, D, Esc Close, Right-click Task menu).

### 11.9 Task detail
- **Container:** phone is full screen; web is a 420 side panel with a 1px ink-3 left border.
- **Header** (56 tall):
  - Phone: back chevron on the left, trash on the right.
  - Web: "Quick task" / "Deep task" label (13/500 ink-6) on the left, trash and x on the right.
- **Title:** an editable 24/600 tight input. It saves on change.
- **Chip row** (12 below the title):
  - Date (calendar icon, e.g. "Today, 5 PM") opens the picker.
  - Project (coloured dot) opens the project.
  - Reminder (bell, e.g. "10 min before"), or a "Remind" chip if none.
  - Repeat (repeat icon, e.g. "Weekdays") if set.
  - AI badge if AI-created.

**Quick task** (no subtasks, not marked deep): a hero card (surface, radius 22, padding 20).
- Copy: "A quick task is done or not done. Switch to a deep task to log partial progress, add subtasks and keep a history."
- Buttons: **Mark done** / **Reopen** (primary) and **Track progress** (ghost), which converts it to deep.

**Deep task:**
1. **Progress card** (surface, radius 22, padding 20):
   - Ring 72/7 with the % (17/600, small "%").
   - To its right: the slider, then ghost small buttons **+5% / +10% / +25%**.
   - Below: a note input (40 tall) with the placeholder "Add a note to the next log entry".
   - If there are subtasks, the helper reads "Progress follows subtasks. Each of the 4 counts 25%." (12 ink-6)
2. **Subtasks** block: header "Subtasks" with "2/4" on the right. Rows are 44 tall with a checkbox and a 15px label.
3. **Progress log** block: header "Progress log" with "append-only" on the right. It is a vertical timeline (1px ink-3 line), newest first.
   - **Dot:** 8px, ink-5 for You and accent for AI.
   - **Meta** (12 ink-6): mono timestamp "Tue 3:15 PM" . "You" or an AI badge . right-aligned mono "+30 pts" (ok) or "-10 pts" (bad).
   - **Text:** 14.5 ink.
   - **Empty:** "No entries yet. Move the slider to log your first."
4. **Attachments:** clip-icon chips with file names ("api-v2-outline.md", "auth-flow.png").

- **Block headers:** 13/500 ink-6 with a right-aligned value, 32 above and 8 below.
- **Points:** 1% of progress = 1.5 points (a full task = 150 = one ring). Each logged change adds a log entry and haptics on phone.

### 11.10 Date, reminder, repeat (sheet)
- **Title:** "Date, reminder, repeat".
- **Three labelled groups** (label 13/500 ink-6), chips wrapping with a gap of 8:
  - **Date:** Today, Tmrw, Fri 3, Sat 4, ... (7 days), No date.
  - **Reminder** (bell icon, tap again to clear): At time, 10 min before, 1 hour before, Morning of (8:00).
  - **Repeat** (repeat icon): Never, Every day, Weekdays, Every week, Every month.
- **Done:** a full-width primary button.

### 11.11 Approval inbox
- **Top bar:** "Inbox".
  - Subtitle: "3 waiting for your approval" / "You are all caught up".
  - Right: a soft small **Approve all** button (only when 2 or more are waiting).
- **Hint** (13 ink-6):
  - Phone: "Swipe right to approve, left to reject. Tap for details."
  - Web: "Approve or reject from each row. Click a proposal to compare before and after."
- **Groups by app:** header with app mark 24 + app name 14/600 + AI badge, then the rows with a gap of 8. 24 between groups.
- **Approval row:** radius 14, 1px ink-3 inset outline, padding 12.
  - Title 15/500, truncates.
  - Meta: kind (13/500: "Add task" / "Update progress" / "Reschedule") + time.
  - **Web:** Reject (ghost small) and Approve (soft small) on the right.
  - **Phone swipe:**
    - The row follows the finger.
    - Underneath, an ok-soft layer with a check and "Approve" shows on the left (right swipe), or a bad-soft layer with x "Reject" on the right (left swipe). Its opacity tracks the distance and is full at 70px.
    - Releasing past **90px** commits; otherwise the row springs back over 250ms.
- **Detail sheet "What this changes":**
  - App mark 24 + "Claude . 2 min ago" (13 ink-6), then the title 19/600.
  - Two panels side by side (stacked on phone):
    - **Before:** ink-1, radius 14, padding 12, label 13/500 ink-6, text 14.5 ink-7.
    - **After:** accent-soft, label in accent, text in ink.
  - Ghost **Reject** and primary **Approve**, each half width.
- **Feedback:** approve gives the toast "Approved" (plus haptic 18 on phone). Reject gives "Rejected" with Undo.
- **States:**
  - Loading: skeleton.
  - Empty: icon `inbox`, "Nothing to approve", "When an AI app proposes a task or change, it waits here until you say yes.", with a ghost button "Connect an AI app".

### 11.12 Calendar
- **Top bar:**
  - Back button and title "Calendar".
  - Subtitle: "Sep 29 to Oct 5" (week view) or "Oct 2026" (month view).
  - Right: previous/next week buttons and a Week/Month segmented control.
- **Week view:** 7 columns, gap 6 on phone and 8 on web.
  - **Day cell:** radius 14, 1px ink-3 outline. The selected day gets an ink-4 outline; a drop target gets an accent-soft fill with an accent outline.
    - Min height 96 on phone, 288 on web.
  - **Day header:** weekday (13/500 ink-6, 11 on web) and the date number in a 28px circle. **Today** is an accent-filled circle with on-accent text.
  - **Phone:** up to 3 accent dots (6px) per day.
  - **Web:** task pills (ink-1, radius 6, padding 6x8, 12.5px, project dot). They are draggable onto another day to reschedule, with the hint "Drag a task onto another day to reschedule it."
- **Month view:**
  - Weekday header row Mon to Sun.
  - Cells 56 tall on phone and 96 on web, radius 10.
  - Days outside the month are at 30% opacity.
  - The selected cell gets an accent-soft fill and accent outline. Today has an accent circle.
  - Web shows up to 2 task titles (11px pills); phone shows dots.
- **Below the grid:** a section header with the selected date ("Today" / "Fri 3 Oct") and that day's task rows.
  - Empty: icon `calendar`, "Nothing planned", "This day is open."

### 11.13 Streak and heatmap
- **Top bar:** back button + "Streak".
- **Stats row** (bottom-aligned, gap 24):
  - **Current:** flame icon 44 (warn, 1.5 stroke) + **14** at 64/600, then "day streak" (14 ink-6) below.
  - **Best:** **41** at 24/600, "best" (13 ink-6) below.
  - **Freezes:** two freeze tokens, "2 freezes left" below.
- **Info panel:** surface, radius 14, padding 14, 13.5 ink-6. "Miss a day and Tovy spends a freeze to keep your streak. You get 2 per month. A day counts when you reach 150 progress points."
- **Heatmap:** header "Progress points per day", an 18-week grid (scrolls horizontally on phone), and the legend.
- **Day detail card** (radius 14, outline, padding 16):
  - Date (500 ink) with the mono point count on the right.
  - The explanation depends on the day:
    - 0 points: "Missed. A freeze covered this day."
    - 150 or more: "Ring closed. Logged across 6 entries, 2 by AI apps."
    - Otherwise: "Partial progress. Every point still counts."
  - **Default:** "Tap a day to see its log."
- **Button:** ghost "Today's log" selects today.

### 11.14 Ring closed (celebration overlay)
- **Backdrop:** full screen, `bg` at 92% with blur. Tapping anywhere dismisses it.
- **Graphic:** a 160 box holding an ok ring (140 wide, 10 stroke) with a 56px ok check that pops in, and 16 burst dots.
- **Text:** "Ring closed" (34/600), then "150 progress points today. Your streak is now 15 days." (15 ink-6, max width 320).
- **Buttons:** ghost **See streak** and primary **Keep going**.
- **Haptic** (phone): 20-40-30.

### 11.15 Projects
- **Top bar:** "Projects", with a plus icon button on the right ("New project").
- **Grid:** 1 column on phone, 2 at 640 and up, gap 8.
- **Project card:** radius 14, outline, padding 16, ink-1 hover.
  - 10px colour dot + name (16/600).
  - "6 tasks . 42% done" (13 ink-6).
  - A 4px progress bar 12 below: ink-2 track, fill in the project colour at the average progress.
- **New project sheet:**
  - Name input (48, auto-focused, placeholder "Project name").
  - Five 36px colour swatches; the selected one gets a 2px ring in its own colour with a 2px offset.
  - Primary **Create project** button, disabled while the name is empty.
- **States:** loading skeleton.

### 11.16 Project detail
- **Top bar:** back button, project name, subtitle "6 tasks".
- **Content:** the project's task rows (routines excluded).
- **Empty:** icon `projects`, "No tasks yet", "Add one from Today and assign it to this project."

### 11.17 Profile
- **Top bar:** "Profile".
- **Identity:** avatar 64 + name (19/600) + email (14 ink-6), then "Google linked" (12 ink-6 with an ok check).
- **Group "AI":**
  - Connected apps (link icon, value = count)
  - Activity feed
  - Prompt kit
- **Group "Settings":**
  - Appearance
  - Notifications row: phone label "Notifications, day and haptics"; web label "Notifications and day".
  - **Web only:** Keyboard shortcuts, value "Press ?", opens the palette.
  - Streak freezes (value "2 left")
  - Export data
  - Sync status (value "Up to date" / "Offline" / "Error")
- **Group (no title):**
  - About, privacy and support
  - Replay first launch
  - Sign out
  - **Delete account** (danger)
- **Sign out dialog:**
  - Title "Sign out?".
  - Body: "Your data stays on this device. Sign back in with Google or an email code to sync again."
  - Buttons: Cancel and **Sign out**.
- **Delete account dialog:**
  - Title: "Delete account".
  - Bulleted list of what is deleted:
    - "All tasks, routines, logs and streaks"
    - "Every AI connection and its history"
    - "Your synced backup. Exports you made stay yours."
  - Confirmation prompt: "Type **delete** to confirm." (mono), then a 44 input whose focus border is bad.
  - Buttons: Cancel and **Delete** (danger, enabled only when the input is exactly `delete`).

### 11.18 Appearance
- **Group "Theme":** segmented control Light / Dark / System. System follows the OS live.
- **Group "Accent":** three equal option cards (radius 14, padding 12, 1px ink-3 outline; the selected card gets a 2px accent outline).
  - Each card: a 32px-tall colour swatch (radius 10), then the name (13/500).
- Changes apply instantly with the 220ms theme cross-fade.

### 11.19 Preferences
- **Group 1:**
  - Title: phone "Notifications and reminders"; web "Browser notifications".
  - Toggles: Task reminders, Morning digest (8:00), AI approval requests.
- **Group "Day":**
  - Day starts at: a dropdown (36 tall, ink-1, radius 10) with 12:00 AM / 3:00 AM / **4:00 AM** / 5:00 AM.
  - Week starts on: segmented Mon / Sun.
- **Group "Feedback":**
  - **Haptics** toggle (phone only).
  - Reduce motion toggle.

### 11.20 Connected apps
- **List group:** each row is at least 68 tall.
  - App mark 36, then the name (15/500) with the last activity below (13 ink-6, e.g. "Proposed 2 tasks . 5 min ago").
  - The permission tag sits on the right (ink-1, radius 6, 12px): "Read only" / "Read and propose" / "Auto-approve".
- **Below the list:** a full-width primary button "+ Add a connection".
- **Empty:** icon `link`, "No apps connected", "Connect Claude, ChatGPT or any MCP app to add tasks by chat.", with the button "Add a connection".

### 11.21 App detail
- **Top bar:** back button + app name.
- **Header:** app mark 48 + last activity text.
- **Group "Permission":** three radio rows (padding 16), each with a title (15/500) and description (13 ink-6):
  - **Read only:** "Can see tasks and progress. Cannot change anything."
  - **Read and propose:** "Changes wait in your Inbox until you approve."
  - **Auto-approve:** "Changes apply immediately. You can still undo from Activity."
- **Revoke:** a full-width danger button **Revoke access**. It opens a dialog:
  - Title "Revoke Claude?".
  - Body: "It will lose access immediately. Items already approved stay in Tovy."
  - Confirm **Revoke**. On confirm: go back and show the toast "Claude revoked".

### 11.22 Add a connection
- **Intro** (14.5 ink-6): "Give an AI app this address. It can read your tasks and propose changes. You approve every write."
- **URL field:** ink-1, radius 14, padding 6 (16 on the left).
  - The mono 13px URL truncates.
  - A small primary **Copy** button (copy icon) sits inside on the right and shows the toast "MCP URL copied".
- **Guide:** a segmented control Claude / ChatGPT / Other above a numbered list (24px accent-soft discs with mono accent numbers, 15px ink text, gap 12):
  - **Claude:**
    1. Open Settings, then Connectors
    2. Choose Add custom connector
    3. Paste the URL above and name it Tovy
    4. Approve the request on the consent screen
  - **ChatGPT:**
    1. Open Settings, then Connectors
    2. Enable Developer mode, then Create
    3. Paste the URL above as the MCP server
    4. Approve the request on the consent screen
  - **Other:**
    1. Find the MCP or tools settings in your app
    2. Add a remote server with the URL above
    3. Use the OAuth sign-in when asked
- **Footer:** a full-width ghost button "Preview the consent screen".

### 11.23 Consent (OAuth screen, shown in a browser, no app shell)
- **Layout:** a centred card (max width 448, padding 32, radius 22, outline) on `bg`.
- **Header:** app mark 48 . "..." (ink-5) . Tovy logo 48, centred.
- **Title:** "Claude wants to connect to Tovy" (24/600, centred). **Sub:** "Signed in as maya@okafor.studio" (14 ink-6).
- **Permission list** (14.5 ink, 18px icons):
  - check (ok) Read your tasks, routines and progress
  - check (ok) Propose new tasks and changes for your approval
  - x (bad) Delete tasks or change your account
- **Note:** ink-1 panel, radius 10, padding 12, 13 ink-6: "Every change waits in your Inbox. You can revoke access at any time."
- **Buttons:** ghost **Deny** and primary **Allow**, each half width. Toasts: "Denied" / "Claude connected".

### 11.24 Activity feed
- **Top bar:** back button + "Activity".
- **Group list:** rows with padding 16.
  - A 28px circle icon: **write** = accent-soft with an accent spark; **read** = ink-1 with an ink-6 search icon.
  - Text: 14.5 ink, e.g. "Proposed "Draft API doc"".
  - Meta (12.5 ink-6): AI badge with the app name . mono "Write"/"Read" . time.

### 11.25 Prompt kit
- **Intro:** "Tap a phrase to copy it, then paste it into any connected app."
- **Cards:** stacked with a gap of 8. Each is radius 14, outline, padding 16, 15px ink text, with a copy icon 16 (ink-5) on the right. Tapping copies and shows the toast "Copied".
  - "Add this to Tovy: "
  - "What is due this week in Tovy?"
  - "Log 20% progress on "Draft API doc" in Tovy, note: finished webhooks"
  - "Break this plan into Tovy subtasks and propose them"
  - "Move everything due today to tomorrow in Tovy"

### 11.26 Export data
- **Intro:** "Download everything as JSON and CSV: tasks, routines, the full progress log, and AI activity."
- **Card:** radius 22, outline, padding 20. It has three states:
  1. **Idle:** a full-width primary button "Start export" (download icon).
  2. **Working:** "Preparing export" with a mono "48%" on the right, and a 6px progress bar below (ink-2 track, accent fill). It advances in small steps.
  3. **Done:** a 40px ok-soft circle with an ok check, "tovy-export.zip" (500 ink) with "214 KB, ready" below (13 ink-6), and a small primary "Again" button.
- **Never** replay the progress once it is done.

### 11.27 About
- **Header:** logo 56, then the wordmark 24 with "Version 0.9.0 (build 214)" below it (mono 13 ink-6).
- **Group of link rows:** Privacy policy, Terms of service, Support and feedback, Open-source licences.

---

## 12. Global states and rules

- **Sync:** synced / offline / error. Show the banner on Today and the value in Profile. Local data always works.
- **Optimistic updates:** every change appears instantly and syncs in the background.
- **Undo:** delete task and reject approval offer Undo for 5s.
- **Loading:** show a skeleton only on the first load of a list (about 450ms). Never re-show it for data already loaded in the session.
- **Errors:** show them inline next to their cause, never only in a toast.
- **Overdue:** the due label turns `bad`. The title stays ink.
- **AI items:** always show the AI badge. AI log dots are accent; user dots are ink-5.

---

## 13. Data reference (for realistic mockups)

- **Projects:** Work `#4F46E5`, Personal `#0F8A74`, Design `#C2670E`, Health `#C0364F`, Inbox `#5B6B7F`.
- **Example tasks:**
  - "Draft API doc": Work, Today, 42%, AI Claude, 4 subtasks.
  - "Call mum": Personal, Today, 5 PM.
  - "Onboarding flow": Design, 65%, subtasks: Welcome slides (done), Notification ask (done), First task prompt.
  - "Morning pages": routine, 14 day streak.
  - "Run 5k": routine.
- **Example approvals:**
  - Claude: "Add task: Prepare sprint review" (Add task, 2 min ago).
  - Claude: "Draft API doc 42% to 60%" (Update progress).
  - ChatGPT: "Move Dentist to Friday" (Reschedule).
- **Streak:** current 14, best 41, freezes 2 of 2. **Daily goal:** 150 points.
- **MCP URL:** `https://mcp.tovy.app/v1/u/maya-7Fq2kX9`.

---

## 14. Build checklist (for any agent)

- [ ] Colours are taken only from section 1, with neutrals as ink at opacity. No raw greys.
- [ ] Geist for the UI and Geist Mono only for data. Sentence case everywhere.
- [ ] Radius chosen by component type (3.3).
- [ ] One easing curve, short durations, no bounce, and reduced motion respected.
- [ ] Phone and web versions follow section 6. No haptics, swipe-only actions or tab bar on web; no sidebar on phone.
- [ ] Every screen has its loading, empty and error states, and works in light and dark.
- [ ] Focus ring, labels and touch targets meet section 9.
- [ ] Copy matches section 10 and the exact strings in section 11.
